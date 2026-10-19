"use client";
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { csvText, downloadText } from '@/lib/data-export';
import { isMissing } from '@/lib/delimited';
import type { Dataset } from './data-session';
export function DatasetPreview({dataset}:{dataset:Dataset}) {
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);
 const rows=useMemo(()=>dataset.rows.filter(r=>r.some(v=>v.toLowerCase().includes(query.toLowerCase()))),[dataset.rows,query]);
 const pages=Math.max(1,Math.ceil(rows.length/100)),current=Math.min(page,pages-1);
 return <section className="data-preview"><div className="data-preview-heading"><div><h3>{dataset.name}</h3><p>{dataset.message}</p></div><span className={'data-status '+dataset.status}>{dataset.source==='sample'?'Synthetic sample':dataset.source==='public'?'Public experimental data':dataset.status}</span></div><p className="data-help">{dataset.nextStep}</p>{dataset.rows.length>0&&<>
 <label className="data-search">Search loaded rows<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="Search values…" /></label>
 <div className="data-table-wrap"><table><thead><tr>{dataset.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.slice(current*100,(current+1)*100).map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{isMissing(v)?<span className="missing-value">Missing{v?` (${v})`:''}</span>:v}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<p>No rows match “{query}”.</p>}
 <div className="data-actions"><Button variant="outline" size="sm" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</Button><span>Page {current+1} of {pages} · {rows.length} matching / {dataset.rowCount} records</span><Button variant="outline" size="sm" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next</Button><Button variant="outline" size="sm" onClick={()=>downloadText(dataset.name+'.csv',csvText(dataset.headers,rows),'text/csv;charset=utf-8')}>Export matching rows</Button></div>
 <p className="data-help">Search covers all {dataset.rows.length} loaded rows.{dataset.rows.length<dataset.rowCount?' This format retains a preview only.':''} Missing values remain missing. Spreadsheet formulas in text are escaped on CSV export.</p></>}</section>;
}
