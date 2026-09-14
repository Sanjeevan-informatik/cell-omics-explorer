"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Dataset} from './data-session';
import {Button} from './ui/button';
export function DatasetPreview({dataset}:{dataset:Dataset}){
 const [query,setQuery]=useState(''),[rowStart,setRowStart]=useState(0),[columnStart,setColumnStart]=useState(0),[density,setDensity]=useState('comfortable');
 const host=useRef<HTMLElement>(null);const [width,setWidth]=useState(700),[height,setHeight]=useState(800);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  const update=()=>{setWidth(node.clientWidth);setHeight(window.innerHeight);};
  update();window.addEventListener('resize',update);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null;observer?.observe(node);
  return()=>{window.removeEventListener('resize',update);observer?.disconnect();};
 },[]);
 useEffect(()=>{setQuery('');setRowStart(0);setColumnStart(0);},[dataset.id]);
 const rows=useMemo(()=>dataset.rows.filter(r=>r.some(v=>v.toLowerCase().includes(query.toLowerCase()))),[dataset.rows,query]);
 const rowCount=Math.max(5,Math.min(50,Math.floor(height*.45/(density==='compact'?36:48))));
 const cellWidth=density==='compact'?130:180;
 const extraCount=Math.max(1,Math.floor((width-cellWidth-24)/cellWidth));
 const extraTotal=Math.max(0,dataset.headers.length-1),column=extraTotal<=extraCount?0:Math.min(columnStart,Math.max(0,extraTotal-1));
 const columns=dataset.headers.length?[0,...Array.from({length:Math.min(extraCount,Math.max(0,extraTotal-column))},(_,i)=>1+column+i)]:[];
 const first=Math.min(rowStart,Math.max(0,rows.length-1));
 return <section ref={host} className="data-preview omics-responsive-preview" data-density={density}>
 <div className="data-preview-heading"><div><h3>{dataset.name}</h3><p>{dataset.message}</p></div><span className={'data-status '+dataset.status}>{dataset.source==='sample'?'Synthetic sample':dataset.status}</span></div><p className="data-help">{dataset.nextStep}</p>
 {dataset.rows.length>0&&<>
 <div className="omics-preview-controls"><label className="data-search">Filter preview rows<input value={query} onChange={e=>{setQuery(e.target.value);setRowStart(0);}} placeholder="Search values…"/></label><label className="data-label">Display density<select value={density} onChange={e=>setDensity(e.target.value)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div>
 <p className="data-help" aria-live="polite">Rows {rows.length?first+1:0}–{Math.min(first+rowCount,rows.length)} of {rows.length} matching preview records. Showing {columns.length} of {dataset.headers.length} columns.</p>
 {extraTotal>extraCount&&<div className="omics-preview-navigation" aria-label="Column navigation"><Button variant="outline" disabled={column===0} onClick={()=>setColumnStart(Math.max(0,column-extraCount))}>← Columns</Button><label className="data-label">First visible data column<select value={column} onChange={e=>setColumnStart(+e.target.value)}>{dataset.headers.slice(1).map((h,i)=><option key={i} value={i}>{h}</option>)}</select></label><Button variant="outline" disabled={column+extraCount>=extraTotal} onClick={()=>setColumnStart(column+extraCount)}>Columns →</Button></div>}
 <div className="data-table-wrap" role="region" aria-label={dataset.name+' data table'} tabIndex={0}><table><caption>First source column stays visible while browsing other columns. Values and units are shown as supplied.</caption><thead><tr>{columns.map(i=><th scope="col" key={i}>{dataset.headers[i]}</th>)}</tr></thead><tbody>{rows.slice(first,first+rowCount).map((r,i)=><tr key={first+i}>{columns.map(j=><td key={j}>{r[j]?.trim()?r[j]:<span className="missing-value">Missing</span>}</td>)}</tr>)}</tbody></table></div>
 {!rows.length&&<p>No preview rows match “{query}”. Clear the filter to see your data.</p>}
 <div className="omics-preview-navigation"><Button variant="outline" disabled={first===0} onClick={()=>setRowStart(Math.max(0,first-rowCount))}>← Rows</Button><span>{rows.length?first+1:0}–{Math.min(first+rowCount,rows.length)}</span><Button variant="outline" disabled={first+rowCount>=rows.length} onClick={()=>setRowStart(first+rowCount)}>Rows →</Button></div>
 <p className="data-help">The source contains {dataset.rowCount} records; {dataset.rows.length} records are retained in this preview. Filtering and navigation cover retained records only. No values are imputed.</p>
 </>}
 </section>;
}
