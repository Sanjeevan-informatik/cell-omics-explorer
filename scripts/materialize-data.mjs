import {cp,mkdir,readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const root=resolve('.');const catalog=JSON.parse(await readFile('data/catalog/datasets.json','utf8'));
// Add namespaced v5 assets without deleting current sample or legacy paths.
for(const d of catalog.datasets){const src=resolve(root,d.storage_path);const dst=resolve(root,'public'+d.public_path);if(!src.startsWith(root+'/data/')||!dst.startsWith(root+'/public/data/'))throw Error('Catalog path outside data roots');await mkdir(dirname(dst),{recursive:true});await cp(src,dst);}
await mkdir('public/data/knowledge',{recursive:true});for(const name of ['unified-atlas.json','biological-hierarchy.json','legacy-explorer.json','metabolome-structures.json','epigenome-structures.json'])await cp('data/knowledge/'+name,'public/data/knowledge/'+name);
await cp('data/catalog/datasets.json','public/data/catalog-v5.json');
console.log(`Materialized ${catalog.datasets.length} v5 datasets; current samples retained.`);
const epi=JSON.parse(await readFile('data/knowledge/epigenome-structures.json','utf8'));
const {writeFile}=await import('node:fs/promises');
await mkdir('public/data/epigenome',{recursive:true});
await writeFile('public/data/epigenome/teaching-dna.fasta',`>${epi.sequence.id} synthetic teaching; no participant\n${epi.sequence.sequence}\n`);
await writeFile('public/data/epigenome/modification-calls.tsv','position_1based\tspan\tmodification\tparent_sequence\n'+epi.exampleCalls.map(c=>[c.position,c.span||1,c.modification,epi.sequence.sequence.slice(c.position-1,c.position-1+(c.span||1))].join('\t')).join('\n')+'\n');
await writeFile('public/data/epigenome/tracks.tsv','track\tstart_1based\tend_inclusive\tvalue\tunit\n'+epi.tracks.flatMap(t=>t.values.map((v,i)=>[t.id,t.bins[i].start,t.bins[i].end,v,t.unit].join('\t'))).join('\n')+'\n');
