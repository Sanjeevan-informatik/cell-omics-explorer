import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, appType: 'custom', server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { validateSingleCell, importExpressionTable, importMatrixMarket, geneValues, summarizeGene } = await vite.ssrLoadModule('/lib/single-cell.ts');
const { inspectData } = await vite.ssrLoadModule('/lib/data-import.ts');
const { linkSamples } = await vite.ssrLoadModule('/lib/sample-links.ts');
const { csvText } = await vite.ssrLoadModule('/lib/data-export.ts');
const measure = { kind: 'counts', unit: 'counts', processing: 'Test fixture' };
const matrix = 'gene,C1,C2\nG1,0,3\nG2,2,0\n';
const metadata = 'cell_id,sample_id,x,y,cluster\nC2,S2,2,3,B\nC1,S1,0,1,T\n';
const data = () => importExpressionTable(matrix, 'matrix.csv', measure, metadata, 'cells.csv');
const dataset = (id, text, source = 'upload', category = 'multiomics') => ({ ...inspectData(id + '.tsv', text, category), id, name: id, source, bytes: text.length });

test('expression table is transposed to cells × genes; annotations join by ID, not row order', () => {
  const d = data();
  assert.deepEqual(d.matrix.values, [[0, 2], [3, 0]]);
  assert.deepEqual(d.cells.map(c => c.sampleId), ['S1', 'S2']);
  assert.deepEqual(d.embeddings.supplied.coordinates, [[0, 1], [2, 3]]);
  assert.deepEqual(geneValues(d, 0), [0, 3]);
});
test('mismatched, duplicate and missing identifiers fail before displaying biological results', () => {
  assert.throws(() => importExpressionTable(matrix, 'a.csv', measure, metadata.replace('C2', 'C3')), /match/);
  assert.throws(() => importExpressionTable(matrix, 'a.csv', measure, metadata.replace('C2', 'C1')), /unique/);
  assert.throws(() => importExpressionTable(matrix.replace('G2', 'G1'), 'a.csv', measure), /unique/);
  assert.throws(() => importExpressionTable(matrix.replace('C2', 'C1'), 'a.csv', measure), /unique/);
});
test('missing expression never becomes zero, and counts cannot be negative or fractional', () => {
  for (const value of ['', 'NA', 'NaN', 'Infinity', '-1', '0.5']) assert.throws(() => importExpressionTable(matrix.replace('G1,0,3', `G1,${value},3`), 'a.csv', measure));
  const d = importExpressionTable(matrix, 'a.csv', measure);
  assert.deepEqual(d.embeddings, {});
  assert.equal(geneValues(d, 0)[0], 0);
});
test('Matrix Market keeps genes × cells orientation and explicit sparse-zero semantics', () => {
  const d = importMatrixMarket('%%MatrixMarket matrix coordinate integer general\n% fixture\n2 2 2\n1 2 3\n2 1 2\n', 'G1\tGene 1\tGene Expression\nG2\tGene 2\tGene Expression', 'C1\nC2', metadata);
  assert.deepEqual(geneValues(d, 0), [0, 3]); assert.deepEqual(geneValues(d, 1), [2, 0]);
  assert.deepEqual(d.cells.map(c => c.sampleId), ['S1', 'S2']);
  assert.throws(() => importMatrixMarket('%%MatrixMarket matrix coordinate real general\n2 2 2\n1 1 3\n1 1 4', 'G1\nG2', 'C1\nC2'), /Duplicate/);
  assert.throws(() => importMatrixMarket('%%MatrixMarket matrix coordinate integer general\n2 3 1\n1 2 3', 'G1\nG2', 'C1\nC2'), /dimensions/);
  assert.throws(() => importMatrixMarket('%%MatrixMarket matrix coordinate integer symmetric\n2 2 0', 'G1\nG2', 'C1\nC2'), /general/);
});
test('package validator rejects malformed CSR pointers, duplicates, out-of-range indices and embeddings', () => {
  for (const matrix of [
    { encoding: 'csr', indptr: [0, 1, 1], indices: [2], data: [1] },
    { encoding: 'csr', indptr: [0, 2, 2], indices: [0, 0], data: [1, 2] },
    { encoding: 'csr', indptr: [0, 2, 1], indices: [0], data: [1] },
  ]) assert.throws(() => validateSingleCell({ ...data(), matrix }));
  assert.throws(() => validateSingleCell({ ...data(), embeddings: { bad: { axes: ['x', 'y'], coordinates: [[1, 2]] } } }), /pair per cell/);
  assert.throws(() => validateSingleCell({ ...data(), schema: 'future' }));
  const wide = data();
  wide.cells[0].metadata = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`column${i}`, 'a']));
  wide.cells[1].metadata = { extra: 'b' };
  assert.throws(() => validateSingleCell(wide), /distinct metadata/);
});
test('group summaries use original units and suppress detection for scaled or unknown values', () => {
  const d = data();
  assert.deepEqual(summarizeGene(d, 0, 'cluster').map(r => [r.label, r.mean, r.detected]), [['T', 0, 0], ['B', 3, 1]]);
  d.measurement.kind = 'scaled'; d.matrix.values[0][0] = -1;
  assert.equal(summarizeGene(d, 0, 'cluster')[0].detected, null);
});
test('public PBMC package validates and roundtrips without losing cells, features or values', async () => {
  const content = await readFile('public/data/pbmc3k/pbmc3k.cellomics.json', 'utf8');
  const checksum = (await readFile('public/data/pbmc3k/SHA256SUMS', 'utf8')).split(' ')[0];
  assert.equal(createHash('sha256').update(content).digest('hex'), checksum);
  const d = validateSingleCell(JSON.parse(content));
  assert.equal(d.cells.length, 2638); assert.equal(d.genes.length, 16);
  assert.equal(Object.keys(d.embeddings).length, 2); assert.equal(d.matrix.data.length, 10947);
  assert.equal(new Set(d.cells.map(c => c.metadata.cell_type)).size, 8);
  assert.deepEqual(validateSingleCell(JSON.parse(JSON.stringify(d))), d);
  const inspected = inspectData('pbmc.json', content, 'genome');
  assert.equal(inspected.category, 'singlecell'); assert.equal(inspected.rows.length, 2638);
});
test('all table rows remain searchable and invalid metadata cannot become ready', () => {
  const d = inspectData('long.csv', 'feature,value\n' + Array.from({ length: 350 }, (_, i) => `g${i},${i}`).join('\n'), 'transcriptome');
  assert.equal(d.rows.length, 350); assert.equal(d.rows[349][0], 'g349');
  const bad = dataset('metadata', 'sample_id\torganism\ttissue\nS1\thuman\tblood\nS1\thuman\tblood');
  assert.equal(bad.status, 'invalid');
});
test('sample links preserve unmatched and ambiguous IDs and separate synthetic from experimental records', () => {
  const metadata = dataset('metadata', 'sample_id\torganism\ttissue\nS1\thuman\tblood');
  const real = dataset('real', 'sample_id\tfeature\tvalue\tunit\nS1\tG1\t\tTPM\nS2\tG1\t3\tTPM\n\tG1\t2\tTPM');
  const synthetic = { ...real, id: 'synthetic', source: 'sample' };
  const links = linkSamples([metadata, real, synthetic]);
  assert.equal(links.evidence.length, 1); assert.equal(links.evidence[0].rows[0][2], '');
  assert.deepEqual(links.coverage[0].unmatched, ['S2']); assert.equal(links.coverage[0].missingIds, 1);
  assert.equal(links.coverage[1].matched, 0);
  assert.equal(linkSamples([metadata, { ...metadata, id: 'duplicate' }, real]).evidence.length, 0);
});
test('real TCGA RNA/protein rows match ten source sample IDs and retain separate units', async () => {
  const provenance = JSON.parse(await readFile('public/data/tcga-brca/provenance.json', 'utf8'));
  const files = await Promise.all(['metadata', 'rna', 'protein'].map(async type => {
    const filename = `tcga_${type}.tsv`, text = await readFile(`public/data/tcga-brca/${filename}`, 'utf8');
    assert.equal(createHash('sha256').update(text).digest('hex'), provenance.files[filename]);
    return dataset(type, text, 'public', type === 'rna' ? 'transcriptome' : type === 'protein' ? 'proteome' : 'multiomics');
  }));
  const links = linkSamples(files);
  assert.equal(links.samples.length, 10); assert.equal(links.evidence.length, 20);
  assert.equal(links.evidence.reduce((n, e) => n + e.count, 0), 60);
  assert.ok(links.coverage.every(c => c.unmatched.length === 0 && c.matched === 10));
});
test('wide matrices link only to exact metadata IDs; formula text is escaped on CSV export', () => {
  const md = dataset('metadata', 'sample_id\torganism\ttissue\nS1\thuman\tblood');
  const expr = dataset('rna', 'gene\tS1\ts1\nG1\t2\t3', 'upload', 'transcriptome');
  const links = linkSamples([md, expr]);
  assert.equal(links.evidence.length, 1); assert.deepEqual(links.coverage[0].unmatched, ['s1']);
  assert.match(csvText(['value'], [['=cmd()'], ['-2.1']]), /"'=cmd\(\)"\r\n"-2.1"/);
});
