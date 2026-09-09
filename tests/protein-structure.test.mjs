import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const {validateStructure,proteinSample,selectAtoms}=await vite.ssrLoadModule('/lib/protein-structure.ts');
test('1–20 preserves every residue and all supplied backbone atoms',()=>{const d=validateStructure(proteinSample());const atoms=selectAtoms(d,1,20);assert.equal(atoms.length,80);assert.equal(new Set(atoms.map(a=>a.residue)).size,20);assert.ok(atoms.every(a=>a.residue<=20));});
test('trajectory changes coordinates while preserving complete atom correspondence',()=>{const d=proteinSample();assert.notDeepEqual(d.frames[0].positions,d.frames[1].positions);for(const f of d.frames)assert.equal(f.positions.length,d.atoms.length);const broken=structuredClone(d);broken.frames[0].positions.pop();assert.throws(()=>validateStructure(broken),/Frames/);});
test('rejects orphan interactions, duplicate atoms and out-of-range PTMs',()=>{let d=proteinSample();d.interactions[0].b='missing';assert.throws(()=>validateStructure(d),/Interactions/);d=proteinSample();d.atoms[1].id=d.atoms[0].id;assert.throws(()=>validateStructure(d),/duplicate/);d=proteinSample();d.modifications[0].residue=999;assert.throws(()=>validateStructure(d),/Modification/);});
test('sequence-only input remains without invented structures',()=>{const d=proteinSample();d.atoms=[];d.bonds=[];d.interactions=[];d.frames=[];d.modifications=[];assert.equal(validateStructure(d).atoms.length,0);});
