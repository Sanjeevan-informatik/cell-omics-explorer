import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({appType:'custom',configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {consensusRegion}=await vite.ssrLoadModule('/lib/consensus-structure.ts');
test('consensus uses known calls and leaves ties and gaps unresolved',()=>{
 const sites=consensusRegion([{id:'a',sequence:'AC-N'},{id:'b',sequence:'AG-?'},{id:'c',sequence:'NC-N'}],1,4);
 assert.deepEqual(sites.map(s=>s.base),['A','C','-','N']);
 assert.equal(sites[0].known,2);assert.equal(sites[0].support,1);
 assert.equal(sites[1].complement,'G');assert.equal(sites[2].gap,true);assert.equal(sites[3].complement,null);
 const tie=consensusRegion([{id:'a',sequence:'A'},{id:'b',sequence:'G'}],1,1)[0];
 assert.deepEqual(tie.alternatives,['A','G']);assert.equal(tie.base,'N');assert.equal(tie.complement,null);
});
test('inclusive range retains alignment coordinates and rejects invalid ranges',()=>{
 const records=[{id:'a',sequence:'ACGT'}];
 assert.deepEqual(consensusRegion(records,2,4).map(s=>[s.position,s.base,s.complement]),[[2,'C','G'],[3,'G','C'],[4,'T','A']]);
 for(const [a,b] of [[0,2],[3,2],[1,5],[1.5,3]]) assert.deepEqual(consensusRegion(records,a,b),[]);
 assert.deepEqual(consensusRegion([],1,1),[]);
});
