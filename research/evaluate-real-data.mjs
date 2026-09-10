import {createServer} from 'vite';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname;
const v=await createServer({root,configFile:false,appType:'custom',resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false}});
try{
 const {inspectData}=await v.ssrLoadModule('/lib/data-import.ts');const {rowsWithColumns,sameSample}=await v.ssrLoadModule('/lib/hierarchy-data.ts');const {EVIDENCE_COLUMNS}=await v.ssrLoadModule('/lib/hierarchy-evidence.ts');
 const datasets=['metadata','rna','protein'].map(kind=>{const name='tcga_'+kind+'.tsv',text=readFileSync(root+'public/data/tcga-brca/'+name,'utf8');const x=inspectData(name,text,'multiomics');assert.equal(x.status,'ready');assert.equal(x.rowCount,x.rows.length);return {...x,id:kind,name,source:'upload'};});
 const metadata=rowsWithColumns(datasets,['participant_id','sample_id','tissue','cell_type','assay_mode','cell_id']);const rows=rowsWithColumns(datasets,EVIDENCE_COLUMNS);assert.equal(metadata.length,10);assert.equal(rows.length,60);
 const links=metadata.map(m=>{const linked=rows.filter(r=>sameSample(r,m)&&r._origin===m._origin);assert.equal(linked.length,6);assert.equal(linked.filter(r=>r.molecule==='rna').length,3);assert.equal(linked.filter(r=>r.molecule==='protein').length,3);assert.equal(new Set(linked.map(r=>r.molecule+':'+r.feature_id)).size,6);return {participant:m.participant_id,sample:m.sample_id,rna:3,protein:3};});
 assert.equal(rows.filter(r=>sameSample(r,{participant_id:metadata[0].participant_id,sample_id:'not-a-sample'})).length,0);
 const controls={mismatched_sample_rejected:true,all_values_finite:rows.every(r=>Number.isFinite(Number(r.value))),no_synthetic_rows:rows.every(r=>r.evidence.startsWith('public experimental:')),no_coordinate_or_time_records:rowsWithColumns(datasets,['x','y','z']).length===0&&rowsWithColumns(datasets,['time_hours']).length===0};assert.ok(Object.values(controls).every(Boolean));
 const summary={date:new Date().toISOString(),source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),imports:datasets.map(d=>({file:d.name,status:d.status,reported:d.rowCount,retained:d.rows.length})),links,controls,values:rows.map(r=>({sample:r.sample_id,molecule:r.molecule,feature:r.feature_id,value:r.value,unit:r.unit}))};writeFileSync(root+'research/real-data-evaluation.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({imports:summary.imports,samples:links.length,controls}));
}finally{await v.close();}
