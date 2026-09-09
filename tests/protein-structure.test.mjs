import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const {validateStructure,proteinSample,selectAtoms}=await vite.ssrLoadModule('/lib/protein-structure.ts');
test('1–20 preserves every residue and all supplied backbone atoms',()=>{const d=validateStructure(proteinSample());const atoms=selectAtoms(d,1,20);assert.equal(atoms.length,80);assert.equal(new Set(atoms.map(a=>a.residue)).size,20);assert.ok(atoms.every(a=>a.residue<=20));});
test('trajectory changes coordinates while preserving complete atom correspondence',()=>{const d=proteinSample();assert.notDeepEqual(d.frames[0].positions,d.frames[1].positions);for(const f of d.frames)assert.equal(f.positions.length,d.atoms.length);const broken=structuredClone(d);broken.frames[0].positions.pop();assert.throws(()=>validateStructure(broken),/Frames/);});
test('rejects orphan interactions, duplicate atoms and out-of-range PTMs',()=>{let d=proteinSample();d.interactions[0].b='missing';assert.throws(()=>validateStructure(d),/Interactions/);d=proteinSample();d.atoms[1].id=d.atoms[0].id;assert.throws(()=>validateStructure(d),/duplicate/);d=proteinSample();d.modifications[0].residue=999;assert.throws(()=>validateStructure(d),/Modification/);});
test('sequence-only input remains without invented structures',()=>{const d=proteinSample();d.atoms=[];d.bonds=[];d.interactions=[];d.frames=[];d.modifications=[];assert.equal(validateStructure(d).atoms.length,0);});

test('every teaching bundle validates and covers complete reference categories',async()=>{const {proteinTeachingSamples,MODIFICATIONS}=await vite.ssrLoadModule('/lib/protein-structure.ts');const sets=proteinTeachingSamples();sets.forEach(validateStructure);assert.equal(sets[1].sequence.length,100);assert.equal(new Set(sets[1].sequence).size,20);assert.equal(sets[1].modifications.length,MODIFICATIONS.length);assert.equal(sets[2].atoms.length,0);});
test('automatic boxes shrink with larger ranges and respect user limits',async()=>{const {residueBoxSize}=await vite.ssrLoadModule('/lib/protein-structure.ts');assert.ok(residueBoxSize(10,900,28,64,'auto')>residueBoxSize(30,900,28,64,'auto'));assert.equal(residueBoxSize(500,300,28,64,'auto'),28);assert.equal(residueBoxSize(1,900,28,64,'auto'),64);assert.equal(residueBoxSize(20,900,32,80,'min'),32);assert.equal(residueBoxSize(20,900,32,80,'max'),80);});

test('modified teaching peptide has explicit component atoms, attachment bonds and complete frames',async()=>{
 const {modifiedProteinSample,modificationGraph}=await vite.ssrLoadModule('/lib/protein-modifications.ts');const d=validateStructure(modifiedProteinSample());
 assert.equal(d.modifications[0].atom_ids.length,4);assert.equal(d.modifications[1].atom_ids.length,3);
 for(const m of d.modifications){const g=modificationGraph(d,m);assert.equal(g.atoms.length,m.atom_ids.length+1);assert.ok(g.bonds.some(b=>b.a===m.attachment_atom_id||b.b===m.attachment_atom_id));}
 assert.ok(d.bonds.some(b=>b.a==='16:P'&&b.b==='16:OP1'&&b.order===2));assert.ok(d.bonds.some(b=>b.a==='9:AC'&&b.b==='9:AO'&&b.order===2));
 for(const f of d.frames)assert.equal(f.positions.length,d.atoms.length);
});
test('rejects modification atom mappings without matching atoms or attachment bonds',async()=>{
 const {modifiedProteinSample}=await vite.ssrLoadModule('/lib/protein-modifications.ts');let d=modifiedProteinSample();d.modifications[0].atom_ids=['missing'];assert.throws(()=>validateStructure(d),/atom_ids/);
 d=modifiedProteinSample();d.modifications[0].attachment_atom_id='9:NZ';assert.throws(()=>validateStructure(d),/annotated residue/);
 d=modifiedProteinSample();d.bonds=d.bonds.filter(b=>!(b.a==='16:OG'&&b.b==='16:P'));assert.throws(()=>validateStructure(d),/explicit bond/);
});
