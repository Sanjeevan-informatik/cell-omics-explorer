import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import {readFileSync} from 'node:fs';
const js=ts.transpileModule(readFileSync('lib/hierarchy-hic.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {contactMatrix,HIERARCHY_HIC}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const lines=HIERARCHY_HIC.content.trim().split('\n').map(l=>l.split('\t')),headers=lines.shift(),rows=lines.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
test('linked Hi-C samples cover all specimens with eight bins and unique symmetric contacts',()=>{for(const sample of ['blood_bulk','blood_T01','liver_bulk']){const m=contactMatrix(rows.filter(r=>r.sample_id===sample));assert.equal(m.bins.length,8);assert.equal(m.cells.size,36);}});
test('contact map rejects duplicate, malformed and mixed-reference contacts',()=>{const r=rows[0];assert.throws(()=>contactMatrix([r,r]),/Duplicate/);assert.throws(()=>contactMatrix([{...r,count:''}]),/integer/);assert.throws(()=>contactMatrix([r,{...rows[1],assembly:'other'}]),/assembly/);});
test('recorded zero remains distinct from an absent contact',()=>{const m=contactMatrix([{...rows[1],count:'0'}]);assert.equal([...m.cells.values()][0],0);assert.equal(m.cells.get('missing'),undefined);});
