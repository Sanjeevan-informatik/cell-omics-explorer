"use client";
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseFasta, SAMPLE_FASTA } from '@/lib/genome-analysis';
import { readSequenceWorkspace, saveSequenceWorkspace } from '@/lib/sequence-workspace';
import { variantSequenceSites, variantSequenceTsv } from '@/lib/variant-sequence';
import { useDataSession } from './data-session';
import { Button } from './ui/button';
import styles from './variant-sequence-explorer.module.css';

export function VariantSequenceExplorer() {
  const router = useRouter();
  const { datasets } = useDataSession();
  const [draft,setDraft] = useState('');
  const [active,setActive] = useState<{fasta:string; source:string} | null>(null);
  const [error,setError] = useState('');
  const [start,setStart] = useState('1'); const [end,setEnd] = useState('');
  const [position,setPosition] = useState(0); const [sample,setSample] = useState(0);
  const [page,setPage] = useState(0); const [size,setSize] = useState('40');
  const records = useMemo(() => active ? parseFasta(active.fasta) : [],[active]);
  const sites = useMemo(() => variantSequenceSites(records),[records]);
  const length = records[0]?.sequence.length ?? 0;
  const validRange = Number.isInteger(+start) && Number.isInteger(+end) && +start >= 1 && +end <= length && +start <= +end;
  const filtered = validRange ? sites.filter(s => s.position >= +start && s.position <= +end) : [];
  const selected = filtered.find(s => s.position === position) ?? filtered[0];
  const currentPage = Math.min(page,Math.max(0,Math.ceil(filtered.length/40)-1));
  const visible = filtered.slice(currentPage*40,currentPage*40+40);
  const selectedIndex = selected ? filtered.indexOf(selected) : -1;
  function load(fasta:string,source:string) {
    try { const parsed = parseFasta(fasta); setActive({fasta,source}); setDraft(fasta); setStart('1'); setEnd(String(parsed[0].sequence.length)); setPosition(0); setSample(0); setPage(0); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to read aligned DNA FASTA.'); }
  }
  function choose(index:number) { setPosition(filtered[index].position); setPage(Math.floor(index/40)); }
  function exportSites() {
    const url = URL.createObjectURL(new Blob([variantSequenceTsv(records,filtered)],{type:'text/tab-separated-values'}));
    const link = document.createElement('a'); link.href=url; link.download='dna-variant-positions.tsv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className={styles.panel} aria-label="DNA variant sequence map">
    <div className={styles.heading}><div><span className={styles.eyebrow}>DNA · Variant positions</span><h2>Variant sequence map</h2><p>Compare DNA bases at variable sites while keeping their original alignment positions.</p></div><span className="scope-badge">{active?.source ?? 'Choose DNA data'}</span></div>
    <div className={styles.toolbar}><Button variant="outline" onClick={()=>load(SAMPLE_FASTA,'Synthetic teaching alignment')}>Load DNA example</Button><Button variant="outline" onClick={()=>{const saved=readSequenceWorkspace(); if(saved) {load(saved.fasta,'Sequence-map alignment'); setPosition(saved.selectedPosition+1);} else setError('No sequence-map alignment is saved in this browser session. Run DNA analysis, or load an aligned FASTA below.');}}>Use sequence-map alignment</Button>
      <label>Uploaded DNA<select value="" onChange={e=>{const d=datasets.find(d=>d.id===e.target.value); if(d?.fasta)load(d.fasta,`${d.source === 'sample'?'Sample':'Uploaded'}: ${d.name}`);}}><option value="">Choose aligned FASTA…</option>{datasets.filter(d=>d.status==='ready'&&d.fasta).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    </div>
    <details className={styles.input}><summary>Paste or upload aligned DNA FASTA</summary><p>At least two equal-length DNA sequences. The first sequence is the comparison reference.</p><label>Aligned FASTA<textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={6} placeholder={'>reference\nACGT\n>sample\nAGGT'}/></label><div className={styles.toolbar}><Button onClick={()=>load(draft,'Pasted DNA alignment')}>Apply DNA sequences</Button><label>Upload FASTA<input type="file" accept=".fa,.fasta,.fna,.txt" onChange={async e=>{const file=e.target.files?.[0]; if(!file)return; if(file.size>5*1024*1024){setError('Choose an aligned FASTA of 5 MB or less.');return;} try{load(await file.text(),`Uploaded: ${file.name}`);}catch{setError('The file could not be read. Try uploading it again.');} e.target.value='';}}/></label></div></details>
    {error&&<p role="alert" className={styles.notice}>{error}</p>}
    {!active?<div className={styles.empty}><h3>Load DNA to see variant positions</h3><p>Use the teaching alignment, your sequence-map data, or an aligned FASTA. VCF tables below contain allele calls; surrounding DNA requires a matching sequence file and is not inferred from VCF.</p></div>:<>
      <p className={styles.notice}>{records.length} sequences · {length.toLocaleString()} alignment columns · {sites.length.toLocaleString()} variable DNA sites. Positions are 1-based alignment columns, including gaps. Chromosome and genome assembly coordinates are not supplied.</p>
      <div className={styles.toolbar}><label>Start position<input type="number" min={1} max={length} value={start} onChange={e=>{setStart(e.target.value);setPage(0);}}/></label><label>End position<input type="number" min={1} max={length} value={end} onChange={e=>{setEnd(e.target.value);setPage(0);}}/></label><label>Base box size<select value={size} onChange={e=>setSize(e.target.value)}><option value="28">Compact</option><option value="40">Comfortable</option><option value="56">Large</option></select></label><Button variant="outline" disabled={!filtered.length} onClick={exportSites}>Export variant DNA TSV</Button></div>
      {!validRange?<p role="alert">Enter a whole-number range between 1 and {length}, with start ≤ end.</p>:!filtered.length?<div className={styles.empty}><h3>No variable DNA sites in this range</h3><p>A site needs two different observed A, C, G or T bases. Gaps and unknown bases (N or ?) alone are not called variants. Widen the range or load another alignment.</p></div>:<>
      <div className={styles.toolbar}><Button variant="outline" disabled={selectedIndex<=0} onClick={()=>choose(selectedIndex-1)}>← Previous variant</Button><strong>Position {selected?.position}</strong><Button variant="outline" disabled={selectedIndex>=filtered.length-1} onClick={()=>choose(selectedIndex+1)}>Next variant →</Button><span>{filtered.length} sites in range</span></div>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label="Variant-only DNA alignment"><table><caption>Only variable columns are shown; skipped positions are not adjacent DNA bases. Select a base to inspect its sequence context.</caption><thead><tr><th scope="col">Sequence / position</th>{visible.map(s=><th scope="col" key={s.position}><button onClick={()=>setPosition(s.position)} aria-pressed={selected?.position===s.position}>{s.position}</button></th>)}</tr></thead><tbody><tr><th scope="row">Consensus (ties shown)</th>{visible.map(s=><td key={s.position}>{s.consensus}</td>)}</tr>{records.map((r,i)=><tr key={r.id}><th scope="row">{r.id}{i===0?' · reference':''}</th>{visible.map(s=><td key={s.position}><button style={{minWidth:+size,height:+size}} data-base={r.sequence[s.position-1]} aria-label={`${r.id}, position ${s.position}, ${r.sequence[s.position-1]}`} aria-pressed={selected?.position===s.position&&sample===i} onClick={()=>{setPosition(s.position);setSample(i);}}>{r.sequence[s.position-1]}</button></td>)}</tr>)}</tbody></table></div>
      <div className={styles.toolbar}><Button variant="outline" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous columns</Button><span>Columns {currentPage*40+1}–{Math.min((currentPage+1)*40,filtered.length)} of {filtered.length}</span><Button variant="outline" disabled={(currentPage+1)*40>=filtered.length} onClick={()=>setPage(currentPage+1)}>Next columns</Button></div>
      {selected&&<div className={styles.detail}><div><h3>DNA position {selected.position}</h3><p>Reference <strong>{selected.reference}</strong> → alternate <strong>{selected.alternates.join(', ')}</strong></p><p>{selected.change} · Consensus {selected.consensus}</p><p>{Object.entries(selected.counts).map(([base,count])=>`${base}: ${count}${/^[ACGT]$/.test(base)?` (${(100*count/selected.canonicalCount).toFixed(1)}%)`:''}`).join(' · ')}</p><small>Percentages use {selected.canonicalCount} known DNA calls across sequences, not sequencing read depth. Missing/gap calls: {selected.missingCount}.</small></div><div><label>Sequence context<select value={sample} onChange={e=>setSample(+e.target.value)}>{records.map((r,i)=><option key={r.id} value={i}>{r.id}{i===0?' (reference)':''}</option>)}</select></label><p>Alignment positions {Math.max(1,selected.position-10)}–{Math.min(length,selected.position+10)} · selected site highlighted</p><code className={styles.context}>{records[sample].sequence.slice(Math.max(0,selected.position-11),selected.position-1)}<mark>{records[sample].sequence[selected.position-1]}</mark>{records[sample].sequence.slice(selected.position,selected.position+10)}</code><Button variant="outline" onClick={()=>{if(saveSequenceWorkspace({fasta:active.fasta,model:'jc69',selectedPosition:selected.position-1}))router.push('/sequence-map');else setError('Browser session storage is unavailable. Open Sequence map and paste this alignment manually.');}}>Open this position in sequence map →</Button></div></div>}
      </>}
    </>}
  </section>;
}
