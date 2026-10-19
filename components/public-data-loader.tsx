"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { inspectData } from '@/lib/data-import';
import type { DataCategory } from '@/lib/data-catalog';
import { useDataSession, type Dataset } from './data-session';
import { Button } from './ui/button';

export function PublicDataLoader() {
  const { datasets, add } = useDataSession(), guard = useRef(false);
  const [busy, setBusy] = useState(''), [message, setMessage] = useState('');
  async function load(which: 'pbmc3k' | 'tcga-brca') {
    if (guard.current) return; guard.current = true; setBusy(which); setMessage('');
    try {
      const files: [string, DataCategory][] = which === 'pbmc3k' ? [['pbmc3k.cellomics.json', 'singlecell'], ['sample_metadata.tsv', 'multiomics']] : [['tcga_metadata.tsv', 'multiomics'], ['tcga_rna.tsv', 'transcriptome'], ['tcga_protein.tsv', 'proteome']];
      const entries: Dataset[] = [];
      for (const [file, category] of files) {
        const name = `${which}/${file}`;
        if (datasets.some(d => d.name === name && d.source === 'public')) continue;
        const response = await fetch(`/data/${name}`);
        if (!response.ok) throw new Error(`Could not load ${file}; try again.`);
        const content = await response.text(), inspection = inspectData(file, content, category);
        if (inspection.status !== 'ready') throw new Error(`${file}: ${inspection.message}`);
        entries.push({ ...inspection, id: crypto.randomUUID(), name, bytes: new Blob([content]).size, source: 'public' });
      }
      add(entries);
      setMessage(entries.length ? `Loaded ${entries.length} public experimental files. Open the workspace below.` : 'This public dataset is already loaded.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load the dataset.'); }
    finally { guard.current = false; setBusy(''); }
  }
  return <section className="public-datasets"><div className="data-section-title"><div><span className="data-eyebrow">REAL EXPERIMENTAL DATA</span><h2>Explore a documented dataset</h2></div></div><div className="data-samples">
    <article><h3>PBMC3k · single-cell RNA</h3><p>2,638 cells from one healthy donor, 16 selected marker genes, existing UMAP/t-SNE coordinates and source cell-type annotations. Processed log-expression; a marker subset.</p><small>10x Genomics / Scanpy / cellxgene · CC BY 4.0 source</small><p><a href="/data/pbmc3k/README.md">Source and transformations</a> · <a href="/data/pbmc3k/pbmc3k.cellomics.json" download>Download package</a></p><div><Button disabled={!!busy} onClick={() => void load('pbmc3k')}>{busy === 'pbmc3k' ? 'Loading…' : 'Load real PBMC data'}</Button><Link href="/explore/singlecell">Open single-cell →</Link></div></article>
    <article><h3>TCGA breast cancer · matched RNA/protein</h3><p>Ten bulk tumor specimens with RNA and RPPA protein measurements for ERBB2, ESR1 and PGR. Matched by source sample ID; no individual-cell or aliquot match is claimed.</p><small>TCGA via cBioPortal · 30 RNA and 30 protein observations</small><p><a href="/data/tcga-brca/provenance.json">Selection and source hashes</a> · <a href="/data/tcga-brca/SOURCE_LICENSE.txt">Source data notice</a></p><div><Button disabled={!!busy} onClick={() => void load('tcga-brca')}>{busy === 'tcga-brca' ? 'Loading…' : 'Load matched TCGA data'}</Button><Link href="/explore/multiomics">Open sample links →</Link></div></article>
  </div>{message && <p className="data-notice" role="status">{message}</p>}</section>;
}
