"use client";
import { useMemo, useState } from 'react';
import { geneValues, summarizeGene, type SingleCellData } from '@/lib/single-cell';
import { csvText, downloadText } from '@/lib/data-export';
import { Button } from './ui/button';
const PALETTE = ['#75e6cb', '#e6bd78', '#86baff', '#e39ccc', '#bbaceb', '#94ce83', '#f3997d', '#a1c9c5', '#d3bfed', '#e4dd81', '#94b3cc', '#deaaaa'];

export function SingleCellWorkbench({ data }: { data: SingleCellData }) {
  const embeddings = Object.keys(data.embeddings);
  const fields = useMemo(() => [...new Set(data.cells.flatMap(c => Object.keys(c.metadata)))], [data]);
  const [embedding, setEmbedding] = useState(embeddings[0] ?? ''), [group, setGroup] = useState(fields.find(k => /cluster|louvain|cell_type/i.test(k)) ?? 'sample_id');
  const [gene, setGene] = useState(0), [colorMode, setColorMode] = useState('annotation'), [query, setQuery] = useState(''), [selected, setSelected] = useState(0);
  const [cellQuery, setCellQuery] = useState(''), [page, setPage] = useState(0);
  const values = useMemo(() => geneValues(data, gene), [data, gene]);
  const summaries = useMemo(() => summarizeGene(data, gene, group), [data, gene, group]);
  const labels = useMemo(() => data.cells.map(c => String((group === 'sample_id' ? c.sampleId : c.metadata[group]) ?? 'Missing')), [data, group]);
  const categories = useMemo(() => [...new Set(labels)].sort(), [labels]);
  const colors = useMemo(() => new Map(categories.map((c, i) => [c, PALETTE[i % PALETTE.length]])), [categories]);
  const coords = data.embeddings[embedding]?.coordinates;
  const extent = useMemo(() => {
    if (!coords) return null;
    const xs = coords.map(p => p[0]), ys = coords.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(650 / (maxX - minX || 1), 330 / (maxY - minY || 1));
    return { cx: (maxX + minX) / 2, cy: (maxY + minY) / 2, scale, minX, maxX, minY, maxY };
  }, [coords]);
  const low = Math.min(...values), high = Math.max(...values);
  const visibleCells = useMemo(() => data.cells.map((c, i) => ({ c, i })).filter(({ c }) => [c.id, c.sampleId, ...Object.values(c.metadata)].some(v => String(v ?? '').toLowerCase().includes(cellQuery.toLowerCase()))), [data, cellQuery]);
  const pages = Math.max(1, Math.ceil(visibleCells.length / 50)), currentPage = Math.min(page, pages - 1), cell = data.cells[selected];
  const geneLabel = (i: number) => data.genes[i].symbol ? `${data.genes[i].symbol} (${data.genes[i].id})` : data.genes[i].id;
  const geneOptions = data.genes.map((g, i) => ({ g, i })).filter(({ g, i }) => i === gene || `${g.id} ${g.symbol ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="single-cell-workbench">
    <div className="data-section-title"><div><span className="data-eyebrow">EXPRESSION & CELL ANNOTATIONS</span><h2>{data.title}</h2></div><Button variant="outline" onClick={() => downloadText('single-cell.cellomics.json', JSON.stringify(data))}>Export reopenable dataset</Button></div>
    <div className="data-metrics"><div><strong>{data.cells.length.toLocaleString()}</strong><span>cells</span></div><div><strong>{data.genes.length.toLocaleString()}</strong><span>measured features</span></div><div><strong>{embeddings.length}</strong><span>supplied embeddings</span></div><div><strong>{data.measurement.kind}</strong><span>{data.measurement.unit}</span></div></div>
    <p className="data-help">{data.measurement.processing}</p>
    {data.provenance && <details className="data-format-guide"><summary>Dataset source and processing</summary><p>{data.provenance.citation}</p><p>{data.provenance.notes}</p><p><a href={data.provenance.url} target="_blank" rel="noreferrer">Source dataset</a> · {data.provenance.license}</p><code className="data-checksum">Source SHA256: {data.provenance.sha256}</code></details>}
    <div className="data-form-grid">
      <label className="data-label">Embedding<select aria-label="Embedding" value={embedding} onChange={e => setEmbedding(e.target.value)} disabled={!embeddings.length}>{embeddings.length ? embeddings.map(e => <option key={e}>{e}</option>) : <option value="">No embedding supplied</option>}</select></label>
      <label className="data-label">Group by<select aria-label="Group by" value={group} onChange={e => setGroup(e.target.value)}><option value="sample_id">sample_id</option>{fields.filter(f => f !== 'sample_id').map(f => <option key={f}>{f}</option>)}</select></label>
      <label className="data-label">Color by<select aria-label="Color by" value={colorMode} onChange={e => setColorMode(e.target.value)}><option value="annotation">Selected annotation</option><option value="gene">Selected gene value</option></select></label>
      <label className="data-label">Find gene<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Gene ID or symbol" /><select aria-label="Selected gene" value={gene} onChange={e => setGene(Number(e.target.value))}>{geneOptions.map(({ i }) => <option key={i} value={i}>{geneLabel(i)}</option>)}</select></label>
    </div>
    {coords && extent ? <div className="cell-chart-panel"><svg viewBox="0 0 760 430" role="img" aria-label={`${embedding} for ${data.cells.length} cells colored by ${colorMode === 'gene' ? geneLabel(gene) : group}. Select a cell from the table for keyboard access.`}>
      <title>Supplied {embedding} coordinates</title><path d="M50 25V385H720" stroke="#416171" fill="none" />
      {coords.map(([x, y], i) => <circle key={data.cells[i].id} cx={385 + (x - extent.cx) * extent.scale} cy={205 - (y - extent.cy) * extent.scale} r={i === selected ? 5 : 2.3} fill={colorMode === 'gene' ? `hsl(${220 - 190 * ((values[i] - low) / (high - low || 1))} 72% 65%)` : colors.get(labels[i])} opacity={i === selected ? 1 : .78} onClick={() => setSelected(i)}><title>{data.cells[i].id} · {labels[i]} · {geneLabel(gene)}: {values[i]}</title></circle>)}
      <circle cx={385 + (coords[selected][0] - extent.cx) * extent.scale} cy={205 - (coords[selected][1] - extent.cy) * extent.scale} r="6" fill="none" stroke="white" strokeWidth="2" pointerEvents="none" />
      <text x="385" y="417" textAnchor="middle">{data.embeddings[embedding].axes[0]}</text><text transform="translate(18 205) rotate(-90)" textAnchor="middle">{data.embeddings[embedding].axes[1]}</text>
    </svg><p className="data-help">{colorMode === 'gene' ? `${geneLabel(gene)}: ${low.toPrecision(4)} (blue) → ${high.toPrecision(4)} (orange), ${data.measurement.unit}.` : categories.length > 24 ? `${categories.length} annotation values; colors repeat. Choose a categorical field for a clearer grouping.` : categories.map(c => <span className="cell-legend" key={c}><i style={{ background: colors.get(c) }} />{c}</span>)} Supplied coordinates; no embedding, clustering or spatial registration is calculated.</p></div> : <div className="data-empty"><h3>Expression is loaded; no embedding supplied</h3><p>Explore the cells and expression summaries below. To plot cells, include x/y in cell metadata or X_umap, X_tsne, X_pca or spatial in H5AD.</p></div>}
    <div className="data-notice" aria-live="polite"><strong>Selected cell: {cell.id}</strong><p>{group}: {labels[selected]} · {geneLabel(gene)}: {values[selected].toPrecision(5)} {data.measurement.unit}</p><details><summary>Cell and gene annotations</summary><dl className="cell-annotations">{Object.entries(cell.metadata).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v ?? 'Missing')}</dd></div>)}{Object.entries(data.genes[gene].metadata).map(([k, v]) => <div key={'gene:' + k}><dt>Gene · {k}</dt><dd>{String(v ?? 'Missing')}</dd></div>)}</dl></details></div>
    <details className="data-format-guide" open><summary>Expression by {group}</summary><p className="data-help">Arithmetic mean in supplied units across all loaded cells in each group. Detection is the fraction with value &gt; 0 and is shown only for counts or nonnegative normalized expression. This is descriptive, not a differential-expression test.</p><div className="data-table-wrap"><table><thead><tr><th>Group</th><th>Cells</th><th>Mean {geneLabel(gene)}</th><th>Detected</th></tr></thead><tbody>{summaries.map(s => <tr key={s.label}><td>{s.label}</td><td>{s.count}</td><td>{s.mean.toPrecision(5)}</td><td>{s.detected === null ? 'Not applicable to scale' : `${(100 * s.detected).toFixed(1)}%`}</td></tr>)}</tbody></table></div></details>
    <label className="data-search">Find cell or annotation<input value={cellQuery} onChange={e => { setCellQuery(e.target.value); setPage(0); }} placeholder="Cell ID, cluster, sample…" /></label><div className="data-table-wrap"><table><thead><tr><th>Cell</th><th>Sample</th><th>{group}</th><th>{geneLabel(gene)}</th></tr></thead><tbody>{visibleCells.slice(currentPage * 50, (currentPage + 1) * 50).map(({ c, i }) => <tr key={c.id} aria-selected={i === selected}><td><button className="data-open" onClick={() => setSelected(i)} aria-label={`Inspect cell ${c.id}`}>{c.id}</button></td><td>{c.sampleId ?? 'Missing'}</td><td>{labels[i]}</td><td>{values[i].toPrecision(5)}</td></tr>)}</tbody></table></div>
    <div className="data-actions"><Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous cells</Button><span>{visibleCells.length} cells · page {currentPage + 1} / {pages}</span><Button size="sm" variant="outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next cells</Button><Button size="sm" variant="outline" onClick={() => downloadText('cell-expression.csv', csvText(['cell_id', 'sample_id', group + ' annotation', geneLabel(gene)], visibleCells.map(({ c, i }) => [c.id, c.sampleId ?? '', labels[i], String(values[i])])), 'text/csv')}>Export selected gene table</Button></div>
  </section>;
}
