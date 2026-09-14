import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const {metaboliteSamples,validateMolecule,moleculeScene}=await vite.ssrLoadModule('/lib/metabolite-structures.ts');
test('molecular examples have consistent heavy-atom compositions and complete frame mappings',()=>{
 const samples=metaboliteSamples();samples.forEach(validateMolecule);
 const expected=[{C:2,O:1},{C:3,O:3},{C:16,O:2},{C:6,O:6},{C:12,O:11}];
 samples.slice(0,5).forEach((d,i)=>{const counts={};d.atoms.forEach(a=>counts[a.element]=(counts[a.element]||0)+1);assert.deepEqual(counts,expected[i]);assert.ok(d.frames.every(f=>f.positions.length===d.atoms.length));assert.equal(moleculeScene(d).atoms.length,d.atoms.length);});
 const glycan=samples[4];assert.ok(glycan.bonds.some(b=>b.a==='A:O1'&&b.b==='B:C4'));assert.equal(samples[5].has3d,false);assert.equal(samples[5].atoms.length,0);
});
test('molecule validation rejects orphan groups, malformed layouts and false trajectories',()=>{
 let d=metaboliteSamples()[0];d.groups[0].atom_ids=['missing'];assert.throws(()=>validateMolecule(d),/existing atom/);
 d=metaboliteSamples()[0];d.atoms[0].x2=NaN;assert.throws(()=>validateMolecule(d),/layout/);
 d=metaboliteSamples()[0];d.has3d=false;assert.throws(()=>validateMolecule(d),/has3d/);
});
