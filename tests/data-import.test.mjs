import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {inspectData,parseDelimited}=await vite.ssrLoadModule('/lib/data-import.ts');
const {TEMPLATES}=await vite.ssrLoadModule('/lib/data-catalog.ts');
test('all downloadable samples match the catalog and import without errors',async()=>{
 for(const t of TEMPLATES){assert.equal(await readFile(`public/data/${t.filename}`,'utf8'),t.content);const result=inspectData(t.filename,t.content,t.category);assert.ok(['ready','preview'].includes(result.status),`${t.id}: ${result.message}`);}
});
test('CSV preserves quoted commas, escaped quotes, and embedded newlines',()=>{
 assert.deepEqual(parseDelimited('a,b\n"x,y","two ""quotes"""\n"line\nbreak",2\n',','),[['a','b'],['x,y','two "quotes"'],['line\nbreak','2']]);
 assert.throws(()=>parseDelimited('a,b\n"unclosed,2',','),/Unclosed/);
});
test('missing cells remain missing instead of becoming zero',()=>{
 const r=inspectData('methylation.tsv','feature\tsample\tbeta\nx\tS1\t\ny\tS2\tNA\n','epigenome');assert.equal(r.status,'ready');assert.equal(r.missing,2);assert.equal(r.rows[0][2],'');
});
test('invalid methylation and malformed tables cannot become ready data',()=>{
 assert.equal(inspectData('x.tsv','feature\tsample\tbeta\nx\tS1\t1.8','epigenome').status,'invalid');
 assert.equal(inspectData('x.csv','a,b\n1,2,3','genome').status,'invalid');
 assert.equal(inspectData('x.csv','a,a\n1,2','genome').status,'invalid');
});
test('binary data offers a conversion route without reading it',()=>{
 const r=inspectData('cohort.h5ad',null,'singlecell');assert.equal(r.status,'unsupported');assert.match(r.nextStep,/Scanpy/);
 assert.equal(inspectData('x.tsv','a\tb\n\0x\ty','genome').status,'invalid');
});
test('FASTA connects to analysis only after alignment validation',()=>{
 assert.equal(inspectData('x.fasta','>a\nACGT\n>b\nACG','genome').status,'invalid');
 assert.equal(inspectData('x.fasta','>a\nACGT\n>b\nACGG','genome').fasta,'>a\nACGT\n>b\nACGG');
});
test('header-only VCF and invalid BED coordinates explain missing input',()=>{
 assert.equal(inspectData('x.vcf','##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO','genome').status,'invalid');
 assert.equal(inspectData('x.bed','demo\t10\t5','genome').status,'invalid');
});
