import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {gzipSync} from 'node:zlib';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const m=await vite.ssrLoadModule('/lib/regional-genome.ts');
const names=Array.from({length:3202},(_,i)=>`sample_${i}`);
const header='##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t'+names.join('\t')+'\n';
const row='chr15\t48100002\trsExample\tA\tG\t.\tPASS\t.\tGT\t'+names.map((_,i)=>i===3201?'1|0':'0/0').join('\t');
function bgzf(data){const gz=gzipSync(data);const extra=Buffer.from([6,0,66,67,2,0,0,0]);const h=Buffer.from(gz.subarray(0,10));h[3]=4;const out=Buffer.concat([h,extra,gz.subarray(10)]);out.writeUInt16LE(out.length-1,16);return out;}
test('single 60,001-base reference retains genomic coordinates',()=>{
 const r=m.parseRegionalReference('>NC_000015.10:48100000-48160000\n'+'A'.repeat(60001));assert.equal(r.start,48100000);assert.equal(r.end,48160000);
 assert.throws(()=>m.parseRegionalReference('>chr15:10-20\nACGT'),/span/);
});
test('plain, gzip and multi-block BGZF preserve all 3,202 sample IDs and last sample calls',async()=>{
 const text=header+row+'\n';
 for(const data of [Buffer.from(text),gzipSync(text),Buffer.concat([bgzf(text.slice(0,12000)),bgzf(text.slice(12000)),bgzf('')])]){
  const blob=new Blob([data]);const signal=new AbortController().signal;
  const h=await m.readRegionalVcfHeader(blob,signal);assert.equal(h.samples.length,3202);assert.equal(h.samples[3201],'sample_3201');
  const lines=[];for await(const l of m.regionalVcfLines(blob,signal))lines.push(l);
  assert.equal(lines[2],row);const v=m.parseRegionalVariant(lines[2],[3201],3202);assert.deepEqual(v.calls,['1|0']);assert.equal(m.genotypeBases(v.calls[0],v.ref,v.alt),'G|A');
 }
});
test('missing and unphased genotypes remain distinct; malformed indices rejected',()=>{
 assert.equal(m.genotypeBases('./1','A','G'),'?/G');
 assert.throws(()=>m.parseRegionalVariant('chr15\t2\t.\tA\tG\t.\t.\t.\tGT\t2|0',[0],1),/allele index/);
});
test('cancelled streams stop without completing',async()=>{
 const c=new AbortController();c.abort();await assert.rejects(async()=>{for await(const l of m.regionalVcfLines(new Blob([header+row]),c.signal))void l;},/abort/i);
});
