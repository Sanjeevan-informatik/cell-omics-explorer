"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UploadCloud, Database, FileDown, Trash2, CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, TEMPLATES, EXTERNAL_FORMATS, type DataCategory, type DataTemplate } from '@/lib/data-catalog';
import { inspectData, MAX_FILE_BYTES } from '@/lib/data-import';
import { saveSequenceWorkspace } from '@/lib/sequence-workspace';
import { useDataSession, type Dataset } from './data-session';
import { DatasetPreview } from './dataset-preview';
const MAX_TOTAL=20*1024*1024;
export function DataHub() {
 const {datasets,add,remove,clear}=useDataSession();const router=useRouter();
 const [category,setCategory]=useState<DataCategory>('genome');const [filter,setFilter]=useState('');const [selected,setSelected]=useState<string|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [drag,setDrag]=useState(false);const input=useRef<HTMLInputElement>(null);const importing=useRef(false);
 const current=datasets.find(d=>d.id===selected);
 const templates=TEMPLATES.filter(t=>t.category===category&&`${t.title} ${t.filename}`.toLowerCase().includes(filter.toLowerCase()));
 const ready=datasets.filter(d=>d.status==='ready').length;
 function loadSamples(items:DataTemplate[]) {
  const fresh=items.filter(t=>!datasets.some(d=>d.source==='sample'&&d.name===t.filename));
  if(datasets.length+fresh.length>40){setMessage('This session holds up to 40 files. Remove some files before adding samples.');return;}
  const entries:Dataset[]=fresh.map(t=>({...inspectData(t.filename,t.content,t.category),id:crypto.randomUUID(),name:t.filename,bytes:new Blob([t.content]).size,source:'sample'}));
  add(entries);if(entries[0])setSelected(entries[0].id);setMessage(entries.length?`Loaded ${entries.length} synthetic sample files. Open a workspace to inspect them.`:'These samples are already in your session.');
 }
 async function upload(files:FileList|File[]) {
  if(importing.current)return; importing.current=true;setBusy(true);setMessage('Reading selected files…');
  try {
   const list=Array.from(files);if(list.length>20||datasets.length+list.length>40)throw new Error('Choose up to 20 files at a time, with at most 40 files per session.');
   let used=datasets.filter(d=>d.status==='ready'||d.status==='preview').reduce((n,d)=>n+d.bytes,0);const entries:Dataset[]=[];
   for(const file of list) {
    let report=inspectData(file.name,null,category);
    if(report.status!=='unsupported') {
     if(file.size>MAX_FILE_BYTES)report={...report,message:'File exceeds the 5 MiB browser preview limit.',nextStep:'Export a smaller region, feature table, or matrix subset.'};
     else if(used+file.size>MAX_TOTAL)report={...report,message:'The session preview limit is 20 MiB.',nextStep:'Remove files from this session and try again.'};
     else {try{report=inspectData(file.name,await file.text(),category);if(['ready','preview'].includes(report.status))used+=file.size;}catch{report={...report,message:'This file could not be read.',nextStep:'Check local file access and choose the file again.'};}}
    }
    entries.push({...report,id:crypto.randomUUID(),name:file.name,bytes:file.size,source:'upload'});
   }
   add(entries);if(entries[0])setSelected(entries[0].id);setMessage(`Checked ${entries.length} files: ${entries.filter(d=>d.status==='ready').length} ready, ${entries.filter(d=>d.status==='preview').length} preview only, ${entries.filter(d=>['invalid','unsupported'].includes(d.status)).length} need attention.`);
  } catch(error){setMessage(error instanceof Error?error.message:'Import failed.');} finally{setBusy(false);importing.current=false;if(input.current)input.current.value='';}
 }
 function analyze(data:Dataset){if(!data.fasta)return;if(!saveSequenceWorkspace({fasta:data.fasta,model:'jc69',selectedPosition:0})){setMessage('Browser session storage is unavailable. Open DNA analysis and paste your FASTA there.');return;}router.push('/genomics');}
 return <div className="data-hub"><header className="data-hub-header"><div><span className="data-eyebrow">YOUR DATA WORKSPACE</span><h1>Upload, inspect, explore</h1><p>Bring your processed data, or start with a synthetic sample.</p></div><Button variant="outline" disabled={busy} onClick={()=>loadSamples(TEMPLATES)}><Database size={16}/> Load all {TEMPLATES.length} samples</Button></header>
 <div className="data-summary"><div><strong>{datasets.length}</strong><span>files this session</span></div><div><strong>{ready}</strong><span>ready to inspect</span></div><div><strong>{Object.keys(CATEGORY_LABELS).length}</strong><span>omics workspaces</span></div><p>Files stay in this browser session. Refreshing clears this upload list. Opening FASTA in DNA analysis also saves that alignment in this tab’s session storage.</p></div>
 <section className="data-upload-section"><div><label className="data-label" htmlFor="omics-category">1. Choose the data destination</label><select id="omics-category" value={category} disabled={busy} onChange={e=>setCategory(e.target.value as DataCategory)}>{Object.entries(CATEGORY_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><p className="data-help">Tables are assigned to this workspace. DNA FASTA, VCF and BED go to Genome & variants. Select Transcriptome for RNA FASTA or Proteome for protein FASTA.</p></div>
 <div className={'data-drop '+(drag?'dragging':'')} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);void upload(e.dataTransfer.files)}} aria-busy={busy}><UploadCloud size={30}/><h2>2. Drop your files here</h2><p>Or choose multiple files from your computer.</p><Button disabled={busy} onClick={()=>input.current?.click()}>{busy?'Checking files…':'Choose files'}</Button><input ref={input} type="file" multiple hidden onChange={e=>{if(e.target.files)void upload(e.target.files)}}/><small>5 MiB per text file · 20 MiB per session · Binary formats receive conversion guidance</small></div></section>
 {message&&<div className="data-notice" role="status">{message}</div>}
 <section className="data-session-panel"><div className="data-section-title"><h2>Session files</h2>{datasets.length>0&&<Button variant="ghost" disabled={busy} onClick={()=>{clear();setSelected(null);setMessage('Session files cleared. No files on your computer were deleted.')}}><Trash2 size={14}/> Clear session</Button>}</div>
 {!datasets.length?<div className="data-empty"><Database size={28}/><h3>No data loaded yet</h3><p>Choose files above or load a sample below. Missing data is never replaced with invented measurements.</p></div>:<div className="data-file-list">{datasets.map(d=><article key={d.id} className={selected===d.id?'selected':''}><button className="data-file-select" onClick={()=>setSelected(d.id)}>{d.status==='ready'?<CheckCircle2 size={18}/>:<CircleAlert size={18}/>}<span><strong>{d.name}</strong><small>{CATEGORY_LABELS[d.category]} · {d.format} · {d.source==='sample'?'Synthetic sample':'Your file'}</small></span></button><span className={'data-status '+d.status}>{d.status==='invalid'?'Needs correction':d.status==='unsupported'?'Convert first':d.status==='preview'?'Preview only':'Ready'}</span>{d.fasta?<Button size="sm" onClick={()=>analyze(d)}>DNA analysis</Button>:d.status==='ready'?<Link className="data-open" href={'/explore/'+d.category}>Open workspace →</Link>:null}<Button size="sm" variant="ghost" disabled={busy} aria-label={'Remove '+d.name} onClick={()=>remove(d.id)}>×</Button></article>)}</div>}
 {current&&<DatasetPreview key={current.id} dataset={current}/>}</section>
 <section><div className="data-section-title"><div><h2>Sample data & file paths</h2><p className="data-help">All samples are synthetic. Download a template to see column names and units.</p></div><Button variant="outline" disabled={busy} onClick={()=>loadSamples(TEMPLATES.filter(t=>t.category===category))}>Load this category</Button></div><label className="data-search">Find a sample<input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search this category…" /></label><div className="data-samples">{templates.map(t=><article key={t.id}><span className="data-eyebrow">{CATEGORY_LABELS[t.category]}</span><h3>{t.title}</h3><p>{t.description}</p><code>/data/{t.filename}</code><small>{t.units}</small><div><Button size="sm" disabled={busy} onClick={()=>loadSamples([t])}>Load sample</Button><a href={'/data/'+t.filename} download><FileDown size={14}/> Download</a></div></article>)}</div>{!templates.length&&<p>No samples match this search. Try another name or data category.</p>}<p className="data-help">These /data/ paths are bundled application files, not paths on your computer. Use “Choose files” for local files. Remote URL fetching and folder upload are not supported.</p></section>
 <details className="data-format-guide"><summary>Raw or binary data? See supported routes and conversion guidance</summary>{EXTERNAL_FORMATS.map(f=><div key={f.extensions[0]}><strong>{f.extensions.map(e=>'.'+e).join(', ')}</strong><p>{f.tool}: {f.action}</p></div>)}<p>CSV/TSV tables, aligned DNA FASTA, four-line FASTQ, VCF and BED have local readers. Other text formats receive a plain-text preview. File recognition does not imply a complete scientific parser.</p></details>
 </div>;
}
