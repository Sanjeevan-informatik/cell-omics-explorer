export type RegionalReference = { id:string; start:number; end:number; sequence:string };
export function parseRegionalReference(text:string):RegionalReference {
 const lines=text.trim().split(/\r?\n/); const header=lines.shift();
 if(!header?.startsWith('>')||lines.some(l=>l.startsWith('>')))throw new Error('Choose one reference FASTA record for this region.');
 const id=header.slice(1).split(/\s/)[0], sequence=lines.join('').replace(/\s/g,'').toUpperCase();
 if(!sequence||!/^[ACGTRYSWKMBDHVN]+$/.test(sequence))throw new Error('Reference must contain DNA bases, without alignment gaps.');
 if(sequence.length>1_000_000)throw new Error('Choose a reference region up to 1,000,000 bases.');
 const match=id.match(/:(\d+)-(\d+)$/); const start=match?+match[1]:1; const end=start+sequence.length-1;
 if(start<1||match&&+match[2]!==end)throw new Error('FASTA coordinate span does not match its sequence length.');
 return {id,start,end,sequence};
}
export type RegionalVariant = { chrom:string; position:number; id:string; ref:string; alt:string; calls:string[]; line:string };
export function parseRegionalVariant(line:string,samples:number[],sampleCount:number):RegionalVariant {
 const fields=line.split('\t'); const position=Number(fields[1]);
 if(fields.length!==9+sampleCount||!Number.isInteger(position)||position<1||!fields[3]||!fields[4])throw new Error('Invalid VCF row: columns, position or alleles are missing.');
 const gt=fields[8].split(':').indexOf('GT');
 const calls=samples.map(i=>gt<0?'.':fields[9+i].split(':')[gt]??'.');
 const alleleCount=fields[4].split(',').length+1;
 if(calls.some(call=>!/^([0-9]+|\.)([|/]([0-9]+|\.))*$/.test(call)||call.split(/[|/]/).some(a=>a!=='.'&&+a>=alleleCount)))throw new Error('A selected genotype has an invalid allele index.');
 return {chrom:fields[0],position,id:fields[2],ref:fields[3],alt:fields[4],calls,line:[...fields.slice(0,9),...samples.map(i=>fields[9+i])].join('\t')};
}
export function genotypeBases(call:string,ref:string,alt:string){const alleles=[ref,...alt.split(',')];return call.split(/([|/])/).map(a=>a==='|'||a==='/'?a:a==='.'?'?':alleles[+a]??'?').join('');}

// BGZF is a sequence of independent gzip members. Decode each member separately
// so browser implementations need not support concatenated gzip streams.
async function* decodedChunks(file:Blob,signal:AbortSignal,onProgress:(n:number)=>void):AsyncGenerator<Uint8Array>{
 const head=new Uint8Array(await file.slice(0,18).arrayBuffer());
 const gzip=head[0]===31&&head[1]===139;
 let bgzf=false;
 if(gzip&&(head[3]&4)){
  const extraLength=head[10]|head[11]<<8;
  const extra=new Uint8Array(await file.slice(12,12+extraLength).arrayBuffer());
  for(let i=0;i+4<=extra.length;){const n=extra[i+2]|extra[i+3]<<8;if(extra[i]===66&&extra[i+1]===67&&n===2)bgzf=true;i+=4+n;}
 }
 if(gzip&&typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress gzip. Use a recent Chrome/Edge/Firefox, or decompress the VCF locally.');
 if(bgzf){
  let offset=0;
  while(offset<file.size){
   signal.throwIfAborted();
   const h=new Uint8Array(await file.slice(offset,offset+12).arrayBuffer());
   if(h.length<12||h[0]!==31||h[1]!==139)throw new Error('Invalid or truncated BGZF block.');
   const n=h[10]|h[11]<<8;const extra=new Uint8Array(await file.slice(offset+12,offset+12+n).arrayBuffer());let size=0;
   for(let i=0;i+4<=extra.length;){const len=extra[i+2]|extra[i+3]<<8;if(extra[i]===66&&extra[i+1]===67&&len===2)size=(extra[i+4]|extra[i+5]<<8)+1;i+=4+len;}
   if(size<18||offset+size>file.size)throw new Error('Invalid BGZF block size.');
   const block=await new Response(file.slice(offset,offset+size).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   offset+=size;onProgress(offset);yield new Uint8Array(block);
  }
 }else{
  let bytes=0;
  const tracked=file.stream().pipeThrough(new TransformStream<Uint8Array<ArrayBuffer>,Uint8Array<ArrayBuffer>>({transform(chunk,controller){signal.throwIfAborted();bytes+=chunk.length;onProgress(bytes);controller.enqueue(chunk);}}));
  const reader=(gzip?tracked.pipeThrough(new DecompressionStream('gzip')):tracked).getReader();
  try{while(true){signal.throwIfAborted();const {value,done}=await reader.read();if(done)break;yield value;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
}
export async function* regionalVcfLines(file:Blob,signal:AbortSignal,onProgress:(n:number)=>void=()=>{}):AsyncGenerator<string>{
 const decoder=new TextDecoder();let buffer='';
 for await(const chunk of decodedChunks(file,signal,onProgress)){
  buffer+=decoder.decode(chunk,{stream:true});let newline;
  while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline).replace(/\r$/,'');buffer=buffer.slice(newline+1);if(line)yield line;}
  if(buffer.length>8_000_000)throw new Error('A VCF line exceeds the 8 MB safety limit.');
 }
 buffer+=decoder.decode();if(buffer.trim())yield buffer.trimEnd();
}
export async function readRegionalVcfHeader(file:Blob,signal:AbortSignal){
 const meta:string[]=[];let bytes=0;
 for await(const line of regionalVcfLines(file,signal)){
  bytes+=line.length;if(bytes>8_000_000)throw new Error('VCF header exceeds 8 MB.');
  if(line.startsWith('##'))meta.push(line);
  else if(line.startsWith('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t')){
   const samples=line.split('\t').slice(9);
   if(!meta[0]?.startsWith('##fileformat=VCF')||new Set(samples).size!==samples.length)throw new Error('Invalid VCF header or duplicate samples.');
   return {meta,samples};
  }else throw new Error('A genotype VCF with a #CHROM header is required.');
 }
 throw new Error('No VCF sample header found.');
}
