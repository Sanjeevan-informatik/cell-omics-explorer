import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {variantSequenceSites,variantSequenceTsv}=await vite.ssrLoadModule('/lib/variant-sequence.ts');
test('variant-only map preserves sparse alignment coordinates and exported DNA calls',()=>{
 const records=[{id:'ref',sequence:'AACCGGTT'},{id:'sample',sequence:'AGCCGGTA'}];
 const sites=variantSequenceSites(records);
 assert.deepEqual(sites.map(s=>s.position),[2,8]);
 assert.equal(sites[0].change,'Transition'); assert.equal(sites[1].change,'Transversion');
 assert.match(variantSequenceTsv(records,sites),/8\tT\tA\tA\/T\tTransversion\t2\t0\tT\tA/);
});
test('unknown reference remains unresolved and missing calls do not inflate frequencies',()=>{
 const sites=variantSequenceSites([{id:'ref',sequence:'N'},{id:'a',sequence:'A'},{id:'b',sequence:'G'},{id:'gap',sequence:'-'}]);
 assert.equal(sites[0].change,'Reference unresolved'); assert.equal(sites[0].canonicalCount,2);assert.equal(sites[0].missingCount,2);assert.equal(sites[0].consensus,'A/G');
});
test('gaps and missing-only differences do not create substitution calls',()=>{
 assert.deepEqual(variantSequenceSites([{id:'a',sequence:'AC-N'},{id:'b',sequence:'AN??'}]),[]);
 assert.deepEqual(variantSequenceSites([]),[]);
});
