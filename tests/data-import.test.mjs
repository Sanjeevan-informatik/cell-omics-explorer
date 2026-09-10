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

test('RNA and protein FASTA use their declared alphabets without DNA analysis handoff',()=>{
 const r=inspectData('rna.fasta','>rna\nAUGGCU','transcriptome');assert.equal(r.status,'ready');assert.equal(r.fasta,undefined);
 assert.equal(inspectData('rna.fasta','>rna\nATGGCT','transcriptome').status,'invalid');
 assert.equal(inspectData('protein.fasta','>protein\nMAEFPK','proteome').status,'ready');
});
test('hierarchy records join by participant AND sample, and missing coordinates are excluded',async()=>{
 const {sameSample,finiteCoordinate,rowsWithColumns}=await vite.ssrLoadModule('/lib/hierarchy-data.ts');
 assert.equal(sameSample({participant_id:'P2',sample_id:'S1',molecule:'dna'},{participant_id:'P1',sample_id:'S1'},'dna'),false);
 assert.equal(sameSample({participant_id:'P1',sample_id:'S2',molecule:'dna'},{participant_id:'P1',sample_id:'S1'},'dna'),false);
 assert.equal(finiteCoordinate({x:'',y:'1',z:'2'}),false);
 assert.equal(finiteCoordinate({x:'-2',y:'1',z:'2'}),true);
 assert.equal(rowsWithColumns([{id:'1',name:'bad',source:'upload',status:'invalid',headers:['sample_id'],rows:[['S1']],rowCount:1}],['sample_id']).length,0);
});
test('RNA uracil has the expected heavy atoms and valid bond endpoints',async()=>{
 const {URACIL}=await vite.ssrLoadModule('/components/nucleobase-viewer.tsx');
 assert.equal(URACIL.atoms.length,8);assert.equal(URACIL.formula,'C₄H₄N₂O₂');assert.ok(URACIL.bonds.every(b=>b.from<8&&b.to<8));
});

test('range selection is 1-based inclusive and refuses invalid or oversized intervals',async()=>{
 const {rangeError,rangeSequence}=await vite.ssrLoadModule('/lib/sequence-range.ts');
 assert.equal(rangeSequence('A'.repeat(90),{start:20,end:60}).length,41);
 assert.equal(rangeError(20,60,90),'');assert.ok(rangeError(0,60,90));assert.ok(rangeError(60,20,90));assert.ok(rangeError(20,91,90));assert.ok(rangeError(1.5,60,90));assert.ok(rangeError(1,501,900));
});
test('range evidence requires an exact reference, coordinate convention, and full containment',async()=>{
 const {mappedRows}=await vite.ssrLoadModule('/lib/sequence-range.ts');
 const common={reference_id:'rna-A',coordinate_system:'1-based-inclusive'};
 const rows=[{...common,start:'20',end:'60'},{...common,start:'19',end:'40'},{...common,start:'21',end:'61'},{...common,start:'20',end:'20',reference_id:'dna-A'},{...common,start:'20',end:'20',coordinate_system:'0-based'}];
 assert.equal(mappedRows(rows,{start:20,end:60},'rna-A').length,1);assert.equal(mappedRows(rows,{start:20,end:60},'').length,0);
});
test('all three demo specimens have 41 DNA coordinates and two time regions for 20–60',async()=>{
 const {rowsWithColumns}=await vite.ssrLoadModule('/lib/hierarchy-data.ts');const {mappedRows}=await vite.ssrLoadModule('/lib/sequence-range.ts');
 const data=TEMPLATES.filter(t=>t.id.startsWith('hierarchy-')).map(t=>({...inspectData(t.filename,t.content,t.category),id:t.id,name:t.filename,source:'sample'}));
 const coordinates=rowsWithColumns(data,['x','y','z','start','end']);
 for(const sample of ['blood_bulk','blood_T01','liver_bulk']){assert.equal(mappedRows(coordinates.filter(r=>r.sample_id===sample&&r.molecule==='dna'),{start:20,end:60},'demo-dna').length,41);}
});
