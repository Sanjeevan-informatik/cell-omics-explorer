"use client";
import {useMemo,useState} from 'react';
import {Button} from './ui/button';
import {genotypeBases,type RegionalReference,type RegionalVariant} from '@/lib/regional-genome';

export function VcfSequenceMap({reference,variants,samples,chrom,start,end}:{reference:RegionalReference;variants:RegionalVariant[];samples:string[];chrom:string;start:number;end:number}){
 const [mode,setMode]=useState('variants'),[page,setPage]=useState(0),[size,setSize]=useState(60),[confirmed,setConfirmed]=useState(false);
 const byPosition=useMemo(()=>{const map=new Map<number,RegionalVariant[]>();for(const v of variants)map.set(v.position,[...(map.get(v.position)??[]),v]);return map;},[variants]);
 const positions=useMemo(()=>Array.from(byPosition.keys()).filter(p=>p>=start&&p<=end).sort((a,b)=>a-b),[byPosition,start,end]);
 const total=mode==='variants'?positions.length:Math.max(0,end-start+1);
 const pages=Math.max(1,Math.ceil(total/40)),current=Math.min(page,pages-1);
 const visible=Array.from({length:Math.min(40,Math.max(0,total-current*40))},(_,i)=>mode==='variants'?positions[current*40+i]:start+current*40+i);
 function refAt(p:number){return p>=reference.start&&p<=reference.end?reference.sequence[p-reference.start]:'?';}
 function valid(v:RegionalVariant){return v.position>=reference.start&&v.position+v.ref.length-1<=reference.end&&reference.sequence.slice(v.position-reference.start,v.position-reference.start+v.ref.length)===v.ref;}
 function callAt(p:number,i:number){
  const list=byPosition.get(p);if(!list)return '?';
  if(list.length!==1)return 'Multiple records';
  const v=list[0];if(!valid(v))return 'REF mismatch';
  return genotypeBases(v.calls[i]??'.',v.ref,v.alt);
 }
 function consensus(p:number){
  const list=byPosition.get(p);if(!list||list.length!==1||!valid(list[0]))return '?';
  const v=list[0],alleles=[v.ref,...v.alt.split(',')];
  if(alleles.some(a=>!/^[ACGT]$/.test(a)))return 'Complex event';
  const counts=new Map<string,number>();
  for(const call of v.calls)for(const a of call.split(/[|/]/)){const base=a==='.'?null:alleles[+a];if(base)counts.set(base,(counts.get(base)??0)+1);}
  if(!counts.size)return '?';
  const max=Math.max(...counts.values());return [...counts].filter(([,n])=>n===max).map(([base])=>base).sort().join('/');
 }
 return <section aria-label="VCF DNA sequence map" className="module-data">
 <h2>Chromosome sequence map</h2>
 <p>{chrom}:{start.toLocaleString()}–{end.toLocaleString()} · {samples.length} selected samples</p>
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked that this FASTA and VCF use the same chromosome and genome assembly.</label>
 <p className="data-help">Reference is the uploaded DNA. Consensus counts known allele copies across selected samples; ties are shown together. Sample cells preserve genotypes: | means phased, / means unphased, ? means unknown. Positions absent from a variant-only VCF are not assumed confidently reference.</p>
 {!confirmed?<p>Confirm the reference metadata above to compare these files.</p>:<>
 <div className="data-section-title" style={{flexWrap:'wrap',gap:12}}>
 <label className="data-label">Columns<select value={mode} onChange={e=>{setMode(e.target.value);setPage(0);}}><option value="variants">Variant positions only</option><option value="full">Full reference positions</option></select></label>
 <label className="data-label">Box size<select value={size} onChange={e=>setSize(+e.target.value)}><option value={40}>Compact</option><option value={60}>Comfortable</option><option value={90}>Large</option></select></label>
 <label className="data-label">Page<input type="number" min={1} max={pages} value={current+1} onChange={e=>{const n=+e.target.value;if(Number.isInteger(n)&&n>=1&&n<=pages)setPage(n-1);}}/></label>
 </div>
 <div role="region" aria-label="Scrollable chromosome genotype alignment" tabIndex={0} style={{overflow:'auto',maxHeight:600}}>
 <table style={{borderCollapse:'separate',borderSpacing:3}}>
 <caption style={{textAlign:'left'}}>Original 1-based genomic coordinates. Insertions/deletions are displayed as allele strings at their VCF anchor, not expanded into a reconstructed alignment.</caption>
 <thead><tr><th>Track / chromosome position</th>{visible.map(p=><th key={p} style={{minWidth:size}}>{chrom}:{p}</th>)}</tr></thead>
 <tbody><tr><th>Variant marker</th>{visible.map(p=><td key={p} title={(byPosition.get(p)??[]).map(v=>v.id+' '+v.ref+' → '+v.alt).join('; ')}>{byPosition.has(p)?'◆':'—'}</td>)}</tr>
 <tr><th>Reference DNA</th>{visible.map(p=><td key={p}>{refAt(p)}</td>)}</tr>
 <tr><th>Cohort consensus</th>{visible.map(p=><td key={p}>{consensus(p)}</td>)}</tr>
 {samples.map((s,i)=><tr key={s}><th style={{textAlign:'left',whiteSpace:'nowrap'}}>{s}</th>{visible.map(p=><td key={p} style={{minWidth:size,padding:8,fontFamily:'monospace',textAlign:'center',border:'1px solid #42616b',background:byPosition.has(p)?'#183a42':'transparent',overflowWrap:'anywhere'}}>{callAt(p,i)}</td>)}</tr>)}
 </tbody></table></div>
 {!total&&<p>No variant positions in this range. Full reference mode can still display the reference DNA.</p>}
 <div className="data-section-title"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous positions</Button><span>Page {current+1} of {pages}</span><Button variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next positions</Button></div>
 </>}
 </section>;
}
