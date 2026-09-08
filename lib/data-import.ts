import { EXTERNAL_FORMATS, TEMPLATES, type DataCategory } from './data-catalog';
import { parseFasta } from './genome-analysis';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export type Inspection = { status: 'ready' | 'preview' | 'unsupported' | 'invalid'; format: string; category: DataCategory; message: string; nextStep: string; headers: string[]; rows: string[][]; rowCount: number; missing: number; templateId?: string; fasta?: string; };
export function parseDelimited(text: string, delimiter: string): string[][] {
  const records: string[][] = []; let row: string[] = [], value = '', quoted = false, closed = false;
  const field = () => {row.push(value); value = ''; closed = false;};
  const record = () => {field(); if (row.some(v => v.trim())) records.push(row); row = []; if(records.length > 10_001) throw new Error('Preview supports up to 10,000 data rows. Export a smaller subset.');};
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(quoted) { if(char==='"') {if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=char; }
    else if(char===delimiter) field();
    else if(char==='\n'||char==='\r'){if(char==='\r'&&text[i+1]==='\n')i++;record();}
    else if(char==='"' && !value && !closed) quoted=true;
    else {if(closed || char==='"')throw new Error('Malformed quoted field. Use standard CSV quoting.'); value+=char;}
  }
  if(quoted)throw new Error('Unclosed quote in the table.');
  if(value || row.length || closed)record();
  return records;
}
export function inspectData(name: string, text: string | null, category: DataCategory): Inspection {
  const ext=name.toLowerCase().split('.').pop() || '';
  const result: Inspection={status:'preview',format:ext.toUpperCase()||'Unknown',category,message:'',nextStep:'Choose a sample template to see a supported structure.',headers:[],rows:[],rowCount:0,missing:0};
  const external=EXTERNAL_FORMATS.find(f=>(f.extensions as readonly string[]).includes(ext));
  if(external)return {...result,status:'unsupported',message:`${result.format} recognized; this format cannot be parsed here.`,nextStep:`${external.tool}: ${external.action}`};
  if(text===null)return {...result,status:'invalid',message:'File contents were not read.',nextStep:'Choose a text export under 5 MiB.'};
  try {
    text=text.replace(/^\uFEFF/,'');
    if(!text.trim())throw new Error('This file is empty.');
    if(text.includes('\0'))throw new Error('Binary content detected. Select a text export.');
    if(['fa','fasta','fna'].includes(ext)) {
      if(category==='transcriptome'||category==='proteome') {
        if(!text.trimStart().startsWith('>'))throw new Error('FASTA requires a header starting with >.');
        const records=text.trim().split(/^>/m).filter(Boolean).map(block=>{const [id,...lines]=block.split(/\r?\n/);return {id:id.trim(),sequence:lines.join('').replace(/\s/g,'').toUpperCase()};});
        const alphabet=category==='transcriptome'?/^[ACGURYSWKMBDHVN]+$/:/^[ACDEFGHIKLMNPQRSTVWYBXZJUO*]+$/;
        if(records.some(r=>!r.id||!alphabet.test(r.sequence)))throw new Error('Invalid '+(category==='transcriptome'?'RNA (use U, not T)':'protein')+' sequence or empty header.');
        return {...result,status:'ready',format:category==='transcriptome'?'RNA FASTA':'Protein FASTA',headers:['sequence_id','sequence'],rows:records.slice(0,200).map(r=>[r.id,r.sequence]),rowCount:records.length,message:`${records.length} molecular sequences validated.`,nextStep:'Sequence only. Body location and participant identity require separately supplied sample metadata.'};
      }

      const records=parseFasta(text);
      return {...result,status:'ready',format:'Aligned FASTA',category:'genome',headers:['sequence','length'],rows:records.map(r=>[r.id,String(r.sequence.length)]),rowCount:records.length,fasta:text,message:`${records.length} aligned DNA sequences validated.`,nextStep:'Open DNA analysis to calculate variants, distances, and a tree.',templateId:'alignment'};
    }
    if(['fq','fastq'].includes(ext)) {
      const lines=text.trimEnd().split(/\r?\n/);
      if(lines.length%4)throw new Error('FASTQ needs four lines per record. Wrapped FASTQ is not supported.');
      for(let i=0;i<lines.length;i+=4)if(!lines[i].startsWith('@')||!lines[i+2].startsWith('+')||!/^[ACGTRYSWKMBDHVN]+$/i.test(lines[i+1])||lines[i+1].length!==lines[i+3].length||!/^[!-~]+$/.test(lines[i+3]))throw new Error(`FASTQ record ${i/4+1} has an invalid header, base, or quality length.`);
      return {...result,status:'preview',format:'FASTQ',rowCount:lines.length/4,message:`${lines.length/4} read records validated. Raw reads are not aligned.`,nextStep:'Align reads externally and export aligned FASTA for DNA analysis.',headers:['read','sequence','quality'],rows:Array.from({length:Math.min(lines.length/4,200)},(_,i)=>[lines[i*4].slice(1),lines[i*4+1],lines[i*4+3]])};
    }
    if(ext==='vcf') {
      const lines=text.split(/\r?\n/).filter(l=>l.trim());
      if(!lines[0].startsWith('##fileformat=VCF'))throw new Error('VCF is missing its ##fileformat header.');
      const header=lines.find(l=>l.startsWith('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO'));
      if(!header)throw new Error('VCF is missing the tab-separated #CHROM column header.');
      const rows=lines.filter(l=>!l.startsWith('#')).map(l=>l.split('\t'));
      if(rows.some(r=>r.length!==header.split('\t').length||!/^\d+$/.test(r[1])||Number(r[1])<1||!r[3]||!r[4]))throw new Error('VCF records need matching columns, REF/ALT, and positive integer positions.');
      if(!rows.length)throw new Error('VCF has no variant records.');
      return {...result,status:'ready',category:'genome',message:`${rows.length} variants; basic structure validated.`,nextStep:'Inspect the variant table. Genotypes and alleles are not fully validated.',headers:header.slice(1).split('\t'),rows:rows.slice(0,200),rowCount:rows.length,templateId:'variants'};
    }
    if(ext==='bed') {
      const rows=text.split(/\r?\n/).filter(l=>l.trim()&&!/^(#|track|browser)/.test(l)).map(l=>l.split('\t'));
      if(!rows.length||rows.some(r=>r.length<3||!/^\d+$/.test(r[1])||!/^\d+$/.test(r[2])||Number(r[2])<=Number(r[1])))throw new Error('BED needs chromosome, nonnegative start, and end greater than start, separated by tabs.');
      return {...result,status:'ready',category:'genome',headers:['chrom','start','end','name'],rows:rows.slice(0,200).map(r=>[...r.slice(0,3),r[3]||'']),rowCount:rows.length,message:`${rows.length} intervals; 0-based half-open coordinates.`,nextStep:'Confirm the reference assembly before comparing intervals.',templateId:'intervals'};
    }
    if(['csv','tsv','txt','bedgraph'].includes(ext)) {
      const records=parseDelimited(text,ext==='csv'?',':'\t');
      if(records.length<2)throw new Error('A table needs a header and at least one data row.');
      const headers=records[0].map(h=>h.trim());const rows=records.slice(1);
      if(headers.length<2||headers.some(h=>!h)||new Set(headers).size!==headers.length)throw new Error('Use at least two unique, nonempty column names.');
      if(rows.some(r=>r.length!==headers.length))throw new Error('Some rows have a different number of columns. Check the delimiter and quoting.');
      const template=TEMPLATES.find(t=>t.category===category&&t.columns?.every(c=>headers.includes(c)));
      const missing=rows.reduce((n,r)=>n+r.filter(v=>!v.trim()||/^(NA|N\/A|null|NaN)$/i.test(v.trim())).length,0);
      const numeric=new Set(['beta','fraction','position','start','end','count','duplicate_count','mz','intensity','rt_min','tpm','abundance','control','case','x','y','z','time_hours','value','signal','expression','area_um2','mean_intensity','fold_change','CD3','CD4','CD8']);
      for(const [index,h] of headers.entries())if(template&&numeric.has(h))for(const row of rows){const v=row[index].trim();if(!v||/^(NA|N\/A|null|NaN)$/i.test(v))continue;const n=Number(v);if(!Number.isFinite(n))throw new Error(`Column ${h} contains a nonnumeric value.`);if(['beta','fraction'].includes(h)&&(n<0||n>1))throw new Error(`${h} must be between 0 and 1.`);if(!['x','y','z','value','fold_change'].includes(h)&&n<0)throw new Error(`${h} cannot be negative.`);}
      return {...result,status:'ready',headers,rows:rows.slice(0,5000),rowCount:rows.length,missing,templateId:template?.id,message:`${rows.length} rows loaded${missing?`; ${missing} missing values preserved`:''}. ${template?'Matches '+template.title+'.':'Generic table; biological schema not validated.'}`,nextStep:'Inspect rows in the matching workspace. Values are shown as supplied; no normalization or statistical analysis is performed.'};
    }
    return {...result,message:'Text preview available; this format has no scientific parser in the app.',nextStep:'Convert to a matching CSV/TSV template for a structured table.',headers:['text'],rows:text.split(/\r?\n/).slice(0,80).map(l=>[l.slice(0,500)]),rowCount:text.split(/\r?\n/).length};
  } catch(error) {return {...result,status:'invalid',message:error instanceof Error?error.message:'The file could not be parsed.',nextStep:'Correct the file or download a matching sample template, then import again.'};}
}
