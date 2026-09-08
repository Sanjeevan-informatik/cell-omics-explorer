"use client";
import { useState } from 'react';
import type { Dataset } from './data-session';
export function DatasetPreview({dataset}:{dataset:Dataset}) {
 const [query,setQuery]=useState('');
 const rows=dataset.rows.filter(r=>r.some(v=>v.toLowerCase().includes(query.toLowerCase())));
 return <section className="data-preview"><div className="data-preview-heading"><div><h3>{dataset.name}</h3><p>{dataset.message}</p></div><span className={'data-status '+dataset.status}>{dataset.source==='sample'?'Synthetic sample':dataset.status}</span></div><p className="data-help">{dataset.nextStep}</p>{dataset.rows.length>0&&<><label className="data-search">Filter preview rows<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search values…" /></label><div className="data-table-wrap"><table><thead><tr>{dataset.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,100).map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v.trim()||<span className="missing-value">Missing</span>}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<p>No preview rows match “{query}”. Clear the filter to see your data.</p>}<p className="data-help">Showing {Math.min(rows.length,100)} of {dataset.rowCount} records. Filtering searches the first {dataset.rows.length} preview records. No values are imputed.</p></>}</section>;
}
