import { z } from 'zod';
import { parseDelimited, isMissing } from './delimited';

export const SINGLE_CELL_LIMITS = { cells: 10_000, genes: 5_000, values: 1_000_000, bytes: 20 * 1024 * 1024 };
const text = z.string().min(1).max(500);
const scalar = z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()]);
const metadata = z.record(z.string().min(1).max(100), scalar).refine(m => Object.keys(m).length <= 50, 'At most 50 metadata columns are supported.');
const matrix = z.discriminatedUnion('encoding', [
  z.object({ encoding: z.literal('dense'), values: z.array(z.array(z.number().finite()).max(SINGLE_CELL_LIMITS.genes)).max(SINGLE_CELL_LIMITS.cells) }),
  z.object({ encoding: z.literal('csr'), indptr: z.array(z.number().int().nonnegative()).max(SINGLE_CELL_LIMITS.cells + 1), indices: z.array(z.number().int().nonnegative()).max(SINGLE_CELL_LIMITS.values), data: z.array(z.number().finite()).max(SINGLE_CELL_LIMITS.values) }),
]);
const schema = z.object({
  schema: z.literal('cell-omics.singlecell/v1'), title: text,
  cells: z.array(z.object({ id: text, sampleId: text.optional(), metadata: metadata.default({}) })).min(1).max(SINGLE_CELL_LIMITS.cells),
  genes: z.array(z.object({ id: text, symbol: text.optional(), metadata: metadata.default({}) })).min(1).max(SINGLE_CELL_LIMITS.genes),
  matrix,
  measurement: z.object({ kind: z.enum(['counts', 'normalized', 'scaled', 'unknown']), unit: text, processing: z.string().max(5000) }),
  embeddings: z.record(z.string().min(1).max(100), z.object({ axes: z.tuple([text, text]), coordinates: z.array(z.tuple([z.number().finite(), z.number().finite()])).max(SINGLE_CELL_LIMITS.cells) })).refine(e => Object.keys(e).length <= 8, 'At most 8 embeddings are supported.').default({}),
  provenance: z.object({ citation: z.string().max(2000), url: z.string().url().refine(u => /^https?:\/\//.test(u), 'Use an HTTP(S) source URL.'), license: text, sha256: z.string().regex(/^[a-f0-9]{64}$/), notes: z.string().max(5000) }).optional(),
});
export type SingleCellData = z.infer<typeof schema>;
export type Measurement = SingleCellData['measurement'];

function unique(ids: string[], label: string) {
  if (ids.some(id => !id.trim() || id !== id.trim()) || new Set(ids).size !== ids.length) throw new Error(`${label} must be unique, nonempty, and have no surrounding whitespace.`);
}
export function validateSingleCell(input: unknown): SingleCellData {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  const data = parsed.data, n = data.cells.length, p = data.genes.length;
  unique(data.cells.map(c => c.id), 'Cell IDs'); unique(data.genes.map(g => g.id), 'Gene IDs');
  for (const axis of [data.cells, data.genes]) {
    if (new Set(axis.flatMap(entry => Object.keys(entry.metadata))).size > 50) throw new Error('At most 50 distinct metadata columns are supported per axis.');
  }
  const m = data.matrix;
  let values: number[];
  if (m.encoding === 'dense') {
    if (n * p > SINGLE_CELL_LIMITS.values) throw new Error('Dense matrix exceeds 1,000,000 values. Export fewer cells/genes or use CSR.');
    if (m.values.length !== n || m.values.some(row => row.length !== p)) throw new Error('Matrix must have one row per cell and one column per gene.');
    values = m.values.flat();
  } else {
    if (m.indptr.length !== n + 1 || m.indptr[0] !== 0 || m.indptr[n] !== m.data.length || m.indices.length !== m.data.length) throw new Error('CSR pointer, index and data lengths do not match the cells.');
    for (let i = 0; i < n; i++) {
      if (m.indptr[i] > m.indptr[i + 1]) throw new Error('CSR pointers must be nondecreasing.');
      const seen = new Set<number>();
      for (let j = m.indptr[i]; j < m.indptr[i + 1]; j++) {
        if (m.indices[j] >= p || seen.has(m.indices[j])) throw new Error('CSR gene indices must be in range and unique within a cell.');
        seen.add(m.indices[j]);
      }
    }
    values = m.data;
  }
  if (data.measurement.kind === 'counts' && values.some(v => v < 0 || !Number.isSafeInteger(v))) throw new Error('Counts must be nonnegative safe integers.');
  if (data.measurement.kind === 'normalized' && values.some(v => v < 0)) throw new Error('Normalized expression must be nonnegative; choose scaled for signed values.');
  for (const [name, embedding] of Object.entries(data.embeddings)) if (embedding.coordinates.length !== n) throw new Error(`${name} must have one finite coordinate pair per cell.`);
  return data;
}

export function geneValues(data: SingleCellData, gene: number): number[] {
  if (gene < 0 || gene >= data.genes.length) throw new Error('Select a valid gene.');
  const m = data.matrix;
  if (m.encoding === 'dense') return m.values.map(row => row[gene]);
  return data.cells.map((_, i) => {
    for (let j = m.indptr[i]; j < m.indptr[i + 1]; j++) if (m.indices[j] === gene) return m.data[j];
    return 0; // A stored sparse matrix explicitly defines omitted entries as zero.
  });
}

export function summarizeGene(data: SingleCellData, gene: number, group: string) {
  const values = geneValues(data, gene), groups = new Map<string, { count: number; sum: number; positive: number }>();
  data.cells.forEach((c, i) => {
    const label = String((group === 'sample_id' ? c.sampleId : c.metadata[group]) ?? 'Missing');
    const row = groups.get(label) ?? { count: 0, sum: 0, positive: 0 };
    row.count++; row.sum += values[i]; if (values[i] > 0) row.positive++; groups.set(label, row);
  });
  return Array.from(groups, ([label, r]) => ({ label, count: r.count, mean: r.sum / r.count, detected: data.measurement.kind === 'counts' || data.measurement.kind === 'normalized' ? r.positive / r.count : null }));
}

function table(text: string, name: string) {
  const rows = parseDelimited(text.replace(/^\uFEFF/, ''), name.toLowerCase().endsWith('.csv') ? ',' : '\t');
  if (rows.length < 2 || rows.some(r => r.length !== rows[0].length)) throw new Error(`${name}: a rectangular table with a header and data is required.`);
  unique(rows[0], `${name} headers`); return rows;
}
function attachMetadata(data: SingleCellData, content?: string, filename = 'cells.csv') {
  if (!content) return data;
  const [headers, ...rows] = table(content, filename), id = headers.indexOf('cell_id');
  if (headers.length > 54) throw new Error('Cell metadata supports at most 50 annotation columns plus cell_id, sample_id, x and y.');
  if (id < 0) throw new Error('Cell metadata needs a cell_id column.');
  unique(rows.map(r => r[id]), 'Metadata cell IDs');
  const byId = new Map(rows.map(r => [r[id], r]));
  if (byId.size !== data.cells.length || data.cells.some(c => !byId.has(c.id))) throw new Error('Metadata cell IDs must match the expression matrix exactly; row order may differ.');
  const x = headers.indexOf('x'), y = headers.indexOf('y');
  if ((x < 0) !== (y < 0)) throw new Error('Provide both x and y coordinates, or neither.');
  const coordinates: [number, number][] = [];
  data.cells = data.cells.map(c => {
    const row = byId.get(c.id)!;
    if (x >= 0) {
      if ([row[x], row[y]].some(v => isMissing(v) || !Number.isFinite(Number(v)))) throw new Error('All supplied embedding coordinates must be finite numbers.');
      coordinates.push([Number(row[x]), Number(row[y])]);
    }
    const metadata = Object.fromEntries(headers.flatMap((h, i) => ['cell_id', 'sample_id', 'x', 'y'].includes(h) ? [] : [[h, isMissing(row[i]) ? null : row[i]]]));
    const sample = headers.indexOf('sample_id');
    return { ...c, metadata, ...(sample >= 0 && !isMissing(row[sample]) ? { sampleId: row[sample] } : {}) };
  });
  if (x >= 0) data.embeddings = { supplied: { axes: ['x (supplied)', 'y (supplied)'], coordinates } };
  return data;
}

export function importExpressionTable(content: string, filename: string, measurement: Measurement, metadataText?: string, metadataName?: string): SingleCellData {
  const [header, ...rows] = table(content, filename);
  if (!['gene', 'gene_id', 'feature_id'].includes(header[0])) throw new Error('First column must be gene, gene_id, or feature_id; remaining headers must be cell IDs.');
  if (rows.length > SINGLE_CELL_LIMITS.genes || header.length - 1 > SINGLE_CELL_LIMITS.cells || rows.length * (header.length - 1) > SINGLE_CELL_LIMITS.values) throw new Error('Expression matrix exceeds the cell, gene, or 1,000,000-value limit.');
  const values = header.slice(1).map(() => [] as number[]);
  for (const row of rows) for (let i = 1; i < row.length; i++) {
    if (isMissing(row[i]) || !Number.isFinite(Number(row[i]))) throw new Error(`Missing or invalid expression for ${row[0]} / ${header[i]}; missing measurements cannot become zero.`);
    values[i - 1].push(Number(row[i]));
  }
  return validateSingleCell(attachMetadata({ schema: 'cell-omics.singlecell/v1', title: filename, cells: header.slice(1).map(id => ({ id, metadata: {} })), genes: rows.map(r => ({ id: r[0], metadata: {} })), matrix: { encoding: 'dense', values }, measurement, embeddings: {} }, metadataText, metadataName));
}

export function importMatrixMarket(content: string, features: string, barcodes: string, metadataText?: string, metadataName?: string): SingleCellData {
  const lines = content.trim().split(/\r?\n/);
  if (!/^%%MatrixMarket matrix coordinate (integer|real) general$/i.test(lines.shift()!.trim())) throw new Error('Use a general coordinate Matrix Market matrix with integer or real values.');
  const records = lines.filter(l => l.trim() && !l.trim().startsWith('%')).map(l => l.trim().split(/\s+/));
  const shape = records.shift()?.map(Number);
  if (!shape || shape.length !== 3 || shape.some(v => !Number.isSafeInteger(v) || v < 0)) throw new Error('Invalid Matrix Market dimensions.');
  const [ng, nc, nnz] = shape;
  if (!ng || !nc || ng > SINGLE_CELL_LIMITS.genes || nc > SINGLE_CELL_LIMITS.cells || nnz > SINGLE_CELL_LIMITS.values) throw new Error('Matrix exceeds 10,000 cells, 5,000 genes, or 1,000,000 stored values. Export a subset.');
  const genes = features.trim().split(/\r?\n/).map(l => { const [id, symbol, featureType] = l.split('\t'); if (featureType && featureType !== 'Gene Expression') throw new Error('Select only Gene Expression features for this RNA matrix.'); return { id, ...(symbol ? { symbol } : {}), metadata: {} }; });
  const cells = barcodes.trim().split(/\r?\n/).map(id => ({ id, metadata: {} }));
  if (genes.length !== ng || cells.length !== nc || records.length !== nnz) throw new Error('Matrix dimensions do not match features, barcodes, or the declared entry count. Expected genes × cells.');
  const perCell = Array.from({ length: nc }, () => new Map<number, number>());
  for (const row of records) {
    const [g, c, v] = row.map(Number);
    if (row.length !== 3 || !Number.isInteger(g) || !Number.isInteger(c) || g < 1 || g > ng || c < 1 || c > nc || !Number.isSafeInteger(v) || v < 0) throw new Error('Matrix entries need in-range 1-based indices and nonnegative integer counts.');
    if (perCell[c - 1].has(g - 1)) throw new Error('Duplicate matrix coordinates are ambiguous; combine them in the source workflow.');
    perCell[c - 1].set(g - 1, v);
  }
  const matrix: Extract<SingleCellData['matrix'], { encoding: 'csr' }> = { encoding: 'csr', indptr: [0], indices: [], data: [] };
  for (const row of perCell) { for (const [g, v] of row) { matrix.indices.push(g); matrix.data.push(v); } matrix.indptr.push(matrix.data.length); }
  return validateSingleCell(attachMetadata({ schema: 'cell-omics.singlecell/v1', title: 'Imported Matrix Market counts', cells, genes, matrix, measurement: { kind: 'counts', unit: 'counts', processing: 'Supplied counts; no normalization performed.' }, embeddings: {} }, metadataText, metadataName));
}
