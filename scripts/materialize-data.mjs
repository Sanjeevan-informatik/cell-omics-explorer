import {cp,mkdir,readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const root=resolve('.');const catalog=JSON.parse(await readFile('data/catalog/datasets.json','utf8'));
// Add namespaced v5 assets without deleting current sample or legacy paths.
for(const d of catalog.datasets){const src=resolve(root,d.storage_path);const dst=resolve(root,'public'+d.public_path);if(!src.startsWith(root+'/data/')||!dst.startsWith(root+'/public/data/'))throw Error('Catalog path outside data roots');await mkdir(dirname(dst),{recursive:true});await cp(src,dst);}
await mkdir('public/data/knowledge',{recursive:true});for(const name of ['unified-atlas.json','biological-hierarchy.json','legacy-explorer.json','metabolome-structures.json'])await cp('data/knowledge/'+name,'public/data/knowledge/'+name);
await cp('data/catalog/datasets.json','public/data/catalog-v5.json');
console.log(`Materialized ${catalog.datasets.length} v5 datasets; current samples retained.`);
