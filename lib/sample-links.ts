import { isMissing } from './delimited';
import type { SingleCellData } from './single-cell';

export const METADATA_FIELDS = ['organism', 'tissue', 'condition', 'batch', 'assay', 'unit', 'reference_assembly', 'source'] as const;
type DataRows = { id: string; name: string; category: string; source: string; status: string; headers: string[]; rows: string[][]; role?: string; singleCell?: SingleCellData };
export type Sample = { key: string; id: string; source: string; metadata: Record<string, string>; missing: string[] };
export type Evidence = { dataset: DataRows; sampleKey: string; rows: string[][]; headers: string[]; count: number };

export function validateSampleMetadata(headers: string[], rows: string[][]) {
  const column = headers.indexOf('sample_id');
  if (column < 0) throw new Error('Sample metadata requires sample_id.');
  const ids = rows.map(r => r[column]);
  if (ids.some(id => isMissing(id) || id !== id.trim())) throw new Error('Sample IDs must be nonempty and have no surrounding whitespace.');
  if (new Set(ids).size !== ids.length) throw new Error('Sample metadata must contain exactly one row per sample_id.');
}
const keyFor = (source: string, id: string) => JSON.stringify([source === 'sample' ? 'synthetic' : 'experimental', id]);

export function linkSamples<T extends DataRows>(datasets: T[]) {
  const registry = new Map<string, Sample>(), ambiguous = new Set<string>(), issues: string[] = [], evidence: (Evidence & { dataset: T })[] = [];
  for (const d of datasets.filter(d => d.status === 'ready' && d.role === 'sample-metadata')) {
    for (const row of d.rows) {
      const metadata = Object.fromEntries(d.headers.map((h, i) => [h, row[i]])), id = metadata.sample_id, key = keyFor(d.source, id);
      if (registry.has(key)) { ambiguous.add(key); issues.push(`Sample ${id} appears in multiple metadata files. Remove the duplicate before linking.`); }
      else registry.set(key, { key, id, source: d.source, metadata, missing: METADATA_FIELDS.filter(f => !metadata[f] || isMissing(metadata[f])) });
    }
  }
  for (const key of ambiguous) registry.delete(key);
  const coverage = datasets.filter(d => d.status === 'ready' && d.role !== 'sample-metadata').map(d => {
    const grouped = new Map<string, { rows: string[][]; headers: string[]; count: number }>();
    const unmatched = new Set<string>(); let missingIds = 0;
    function add(id: string | undefined, row: string[], headers: string[]) {
      if (!id || isMissing(id)) { missingIds++; return; }
      const key = keyFor(d.source, id);
      if (!registry.has(key)) { unmatched.add(id); return; }
      const group = grouped.get(key) ?? { rows: [], headers, count: 0 };
      group.count++; group.rows.push(row); grouped.set(key, group);
    }
    const si = d.headers.includes('sample_id') ? d.headers.indexOf('sample_id') : d.headers.indexOf('sample');
    let mode = 'No sample_id/sample column or recognized gene/protein-by-sample matrix.';
    if (d.singleCell) {
      mode = 'Cell sample_id';
      d.singleCell.cells.forEach(c => add(c.sampleId, [c.id, c.sampleId ?? ''], ['cell_id', 'sample_id']));
    } else if (si >= 0) { mode = d.headers[si]; d.rows.forEach(r => add(r[si], r, d.headers)); }
    else if (['gene', 'gene_id', 'protein', 'feature_id'].includes(d.headers[0]) && d.headers.length > 1 && d.rows.every(r => r.slice(1).every(v => isMissing(v) || Number.isFinite(Number(v))))) {
      mode = 'Exact sample IDs from matrix headers';
      for (let i = 1; i < d.headers.length; i++) for (const r of d.rows) add(d.headers[i], [r[0], r[i]], [d.headers[0], 'value (unit from source)']);
    }
    grouped.forEach((group, sampleKey) => evidence.push({ dataset: d, sampleKey, ...group }));
    return { id: d.id, name: d.name, mode, matched: grouped.size, unmatched: [...unmatched], missingIds };
  });
  return { samples: [...registry.values()], evidence, coverage, issues };
}
