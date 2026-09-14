import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('all 154 uploaded archive files remain byte-identical at documented preservation paths',async()=>{const m=JSON.parse(await readFile('data/provenance/v5-import-manifest.json','utf8'));assert.equal(m.file_count,154);assert.equal(m.files.length,154);for(const f of m.files)assert.equal(hash(await readFile(f.preserved_path)),f.sha256,f.original_path);});
test('all current sample payloads survive the integration unchanged',async()=>{const files=JSON.parse(await readFile('data/provenance/live-samples-before-v5.json','utf8'));for(const f of files)assert.equal(hash(await readFile(f.path)),f.sha256,f.path);});
