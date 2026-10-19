"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useDataSession } from './data-session';
import { inspectSingleCell, MAX_FILE_BYTES } from '@/lib/data-import';
import { importExpressionTable, importMatrixMarket, validateSingleCell, type Measurement } from '@/lib/single-cell';

export function SingleCellImport() {
  const { add } = useDataSession(), guard = useRef(false);
  const [mode, setMode] = useState('table'), [kind, setKind] = useState<Measurement['kind']>('counts'), [unit, setUnit] = useState('counts');
  const [matrix, setMatrix] = useState<File | null>(null), [features, setFeatures] = useState<File | null>(null), [barcodes, setBarcodes] = useState<File | null>(null), [metadata, setMetadata] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;
  async function text(file: File | null, required = true) {
    if (!file) { if (required) throw new Error('Choose the required files first.'); return undefined; }
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} exceeds the 5 MiB text-file limit.`);
    return file.text();
  }
  async function load() {
    if (guard.current) return; guard.current = true; setBusy(true); setMessage('');
    try {
      if (!matrix) throw new Error('Choose an expression matrix or H5AD file.');
      let data;
      if (mode === 'h5ad') {
        if (!api) throw new Error('Start the optional API and configure NEXT_PUBLIC_API_BASE_URL, or use the local CSV/Matrix Market import.');
        if (matrix.size > 32 * 1024 * 1024) throw new Error('H5AD import is limited to 32 MiB. Export a cell/gene subset.');
        const response = await fetch(`${api.replace(/\/$/, '')}/api/v1/import/h5ad`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: matrix, signal: AbortSignal.timeout(60_000) });
        const body = await response.json();
        if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'The API could not import this H5AD.');
        data = validateSingleCell(body); data.title = matrix.name;
      } else {
        const mt = await text(matrix), md = await text(metadata, false);
        if (mode === 'mtx') data = importMatrixMarket(mt!, (await text(features))!, (await text(barcodes))!, md, metadata?.name);
        else data = importExpressionTable(mt!, matrix.name, { kind, unit, processing: 'User-supplied values and units; no normalization performed.' }, md, metadata?.name);
      }
      add([{ ...inspectSingleCell(data), id: crypto.randomUUID(), name: matrix.name, bytes: new Blob([JSON.stringify(data)]).size, source: 'upload' }]);
      setMessage(`Imported ${data.cells.length} cells and ${data.genes.length} genes. Open the single-cell workspace below.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed.'); }
    finally { guard.current = false; setBusy(false); }
  }
  return <details className="data-format-guide" id="single-cell-import"><summary>Import a single-cell expression dataset</summary><p>Combine expression, cell annotations and supplied coordinates. Cell IDs are matched exactly, even when metadata rows are reordered.</p>
    <label className="data-label">Input format<select aria-label="Input format" value={mode} disabled={busy} onChange={e => { setMode(e.target.value); setMatrix(null); setMessage(''); }}><option value="table">Gene × cell CSV/TSV</option><option value="mtx">10x-style Matrix Market + features + barcodes</option><option value="h5ad">AnnData H5AD via the optional API</option></select></label>
    <div className="data-form-grid"><label className="data-label">{mode === 'h5ad' ? 'H5AD file' : 'Expression matrix'}<input key={mode} type="file" disabled={busy} accept={mode === 'h5ad' ? '.h5ad' : mode === 'mtx' ? '.mtx' : '.csv,.tsv'} onChange={e => setMatrix(e.target.files?.[0] ?? null)} /></label>
      {mode === 'mtx' && <><label className="data-label">features.tsv (no header)<input type="file" disabled={busy} accept=".tsv,.txt" onChange={e => setFeatures(e.target.files?.[0] ?? null)} /></label><label className="data-label">barcodes.tsv (no header)<input type="file" disabled={busy} accept=".tsv,.txt" onChange={e => setBarcodes(e.target.files?.[0] ?? null)} /></label></>}
      {mode !== 'h5ad' && <label className="data-label">Cell metadata (optional CSV/TSV)<input type="file" disabled={busy} accept=".csv,.tsv" onChange={e => setMetadata(e.target.files?.[0] ?? null)} /></label>}
      {mode === 'table' && <><label className="data-label">Measurement scale<select aria-label="Measurement scale" value={kind} disabled={busy} onChange={e => { setKind(e.target.value as Measurement['kind']); setUnit(e.target.value === 'counts' ? 'counts' : 'supplied units'); }}><option value="counts">Raw counts</option><option value="normalized">Nonnegative normalized expression</option><option value="scaled">Scaled / signed values</option><option value="unknown">Unknown</option></select></label><label className="data-label">Unit<input value={unit} disabled={busy} maxLength={500} onChange={e => setUnit(e.target.value)} /></label></>}
    </div>
    {mode === 'h5ad' ? <p className="data-help">This action sends the file to your configured API{api ? ` (${api})` : ' (not configured)'}. The API reads X, obs, var and supported embeddings, then deletes its temporary file. X units remain unknown until confirmed from your source. Larger datasets need a subset.</p> : <p className="data-help">Tables: first column gene/gene_id; remaining headers are cell IDs. Metadata: cell_id plus annotations, optional sample_id and x/y. Matrix Market orientation is genes × cells. Decompress .gz files first. Up to 10,000 cells, 5,000 genes and 1,000,000 stored values. No coordinates are invented when an embedding is absent.</p>}
    <div className="data-actions"><Button disabled={busy || !matrix || (mode === 'h5ad' && !api)} onClick={() => void load()}>{busy ? 'Importing…' : mode === 'h5ad' ? 'Import via configured API' : 'Import dataset locally'}</Button><Link href="/explore/singlecell" className="data-open">Open single-cell workspace →</Link></div>{message && <p role="status" className="data-notice">{message}</p>}
  </details>;
}
