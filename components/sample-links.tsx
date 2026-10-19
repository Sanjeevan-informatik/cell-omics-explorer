"use client";
import { useMemo, useState } from 'react';
import { linkSamples } from '@/lib/sample-links';
import { CATEGORY_LABELS, type DataCategory } from '@/lib/data-catalog';
import { useDataSession } from './data-session';
import { DatasetPreview } from './dataset-preview';

export function SampleLinks() {
  const { datasets } = useDataSession(), linked = useMemo(() => linkSamples(datasets), [datasets]);
  const [selected, setSelected] = useState(''), [filter, setFilter] = useState('');
  const visible = linked.samples.filter(s => `${s.id} ${Object.values(s.metadata).join(' ')}`.toLowerCase().includes(filter.toLowerCase()));
  const sample = visible.find(s => s.key === selected) ?? visible[0];
  const evidence = sample ? linked.evidence.filter(e => e.sampleKey === sample.key) : [];
  return <section className="sample-links"><div className="data-section-title"><div><span className="data-eyebrow">MATCHED SAMPLE EVIDENCE</span><h2>Connect your omics layers</h2></div><a className="data-open" href="/data/sample_metadata.tsv" download>Download metadata template</a></div>
    <p className="data-help">Upload one metadata row per sample_id with tissue, organism, condition, batch, assay and source. Blank fields stay unknown. Matching uses exact, case-sensitive sample IDs; it does not establish the same aliquot or cell. Synthetic samples are kept separate from experimental uploads.</p>
    {linked.issues.map((issue, i) => <p key={i} className="data-notice" role="alert">{issue}</p>)}
    {!linked.samples.length ? <div className="data-empty"><h3>No unambiguous sample metadata loaded</h3><p>Import sample_metadata.tsv in Upload data & samples, or load the public TCGA example. Tables remain available even when no sample link can be established.</p></div> : <>
      <label className="data-search">Find sample<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Sample, participant, tissue…" /></label>
      {sample ? <><label className="data-label">Sample<select aria-label="Sample" value={sample.key} onChange={e => setSelected(e.target.value)}>{visible.map(s => <option key={s.key} value={s.key}>{s.id} · {s.source === 'sample' ? 'Synthetic' : 'Experimental'}</option>)}</select></label>
        <div className="data-notice"><strong>{sample.id}</strong><p>{Object.entries(sample.metadata).filter(([k, v]) => k !== 'sample_id' && v).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>{sample.missing.length > 0 && <p>Not supplied: {sample.missing.join(', ')}.</p>}</div>
        <div className="data-metrics"><div><strong>{new Set(evidence.map(e => e.dataset.category)).size}</strong><span>linked omics categories</span></div><div><strong>{evidence.length}</strong><span>linked datasets</span></div></div>
        {!evidence.length && <p>No measurements match this sample ID.</p>}
        {evidence.map(e => <DatasetPreview key={sample.key + e.dataset.id} dataset={{ ...e.dataset, headers: e.headers, rows: e.rows, rowCount: e.count, message: `${e.count} matched records · ${CATEGORY_LABELS[e.dataset.category as DataCategory]}`, nextStep: 'Values retain source units. Measurements across layers are not normalized, averaged together, or interpreted as causal.' }} />)}
      </> : <p>No samples match this search.</p>}
    </>}
    {linked.coverage.length > 0 && <details className="data-format-guide" open><summary>Link coverage and missing IDs</summary><div className="data-table-wrap"><table><thead><tr><th>Dataset</th><th>Matched samples</th><th>Unmatched IDs</th><th>Rows/cells without ID</th><th>Matching rule</th></tr></thead><tbody>{linked.coverage.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.matched}</td><td title={c.unmatched.join(', ')}>{c.unmatched.length ? `${c.unmatched.length}: ${c.unmatched.slice(0, 5).join(', ')}${c.unmatched.length > 5 ? '…' : ''}` : 'None'}</td><td>{c.missingIds}</td><td>{c.mode}</td></tr>)}</tbody></table></div></details>}
  </section>;
}
