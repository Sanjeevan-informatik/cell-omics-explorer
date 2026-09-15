"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import styles from './vcf-sequence-map.module.css';
import {Button} from './ui/button';
import {genotypeBases,type RegionalReference,type RegionalVariant} from '@/lib/regional-genome';

export function VcfSequenceMap({reference,variants,samples,chrom,start,end}:{reference:RegionalReference;variants:RegionalVariant[];samples:string[];chrom:string;start:number;end:number}){
 const [mode,setMode]=useState('variants'),[windowStart,setWindowStart]=useState(0),[size,setSize]=useState(104),[confirmed,setConfirmed]=useState(false);
 const container=useRef<HTMLElement>(null);
 const [width,setWidth]=useState(640),[jump,setJump]=useState(''),[navigationMessage,setNavigationMessage]=useState('');
 useEffect(()=>{
  const node=container.current;if(!node)return;
  const update=()=>setWidth(node.clientWidth);
  update();
  if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);}
  const observer=new ResizeObserver(update);observer.observe(node);return()=>observer.disconnect();
 },[]);
 const byPosition=useMemo(()=>{const map=new Map<number,RegionalVariant[]>();for(const v of variants)map.set(v.position,[...(map.get(v.position)??[]),v]);return map;},[variants]);
 const positions=useMemo(()=>Array.from(byPosition.keys()).filter(p=>p>=start&&p<=end).sort((a,b)=>a-b),[byPosition,start,end]);
 const total=mode==='variants'?positions.length:Math.max(0,end-start+1);
 const labelWidth=width<600?120:180;
 const columns=Math.max(1,Math.min(80,Math.floor((width-labelWidth-32)/(size+3))));
 const first=Math.min(windowStart,Math.max(0,total-1));
 const visible=Array.from({length:Math.min(columns,Math.max(0,total-first))},(_,i)=>mode==='variants'?positions[first+i]:start+first+i);
 function goToPosition(){
  const value=Number(jump);
  if(!Number.isSafeInteger(value)||value<start||value>end){setNavigationMessage('Enter a chromosome position between '+start+' and '+end+'.');return;}
  const index=mode==='variants'?positions.findIndex(p=>p>=value):value-start;
  if(index<0){setNavigationMessage('No variant at or after this position in the selected range.');return;}
  setWindowStart(index);setNavigationMessage(mode==='variants'&&positions[index]!==value?'Showing the next variant at '+positions[index]+'.':'Position selected.');
 }
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
 return <section aria-label="VCF DNA sequence map" className={styles.panel} ref={container}>
 <span className={styles.eyebrow}>DNA · Reference and variants</span><h2>Chromosome sequence map</h2>
 <p>{chrom}:{start.toLocaleString()}–{end.toLocaleString()} · {samples.length} selected samples</p>
 <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked that this FASTA and VCF use the same chromosome and genome assembly.</label>
 <p className="data-help">Reference is the uploaded DNA. Consensus counts known allele copies across selected samples; ties are shown together. Sample cells preserve genotypes: | means phased, / means unphased, ? means unknown. Positions absent from a variant-only VCF are not assumed confidently reference.</p>
 {!confirmed?<p>Confirm the reference metadata above to compare these files.</p>:<>
 <div className={styles.controls}>
 <label className="data-label">Columns<select value={mode} onChange={e=>{setMode(e.target.value);setWindowStart(0);}}><option value="variants">Variant positions only</option><option value="full">Full reference positions</option></select></label>
 <label className="data-label">Box size<select value={size} onChange={e=>setSize(+e.target.value)}><option value={88}>Compact</option><option value={104}>Comfortable</option><option value={140}>Large</option></select></label>
 <label className="data-label">Go to chromosome position<input type="number" min={start} max={end} value={jump} placeholder={String(start)} onChange={e=>setJump(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')goToPosition();}}/></label><Button variant="outline" onClick={goToPosition}>Go to position</Button>
 </div>
 <p className={styles.window} aria-live="polite">{visible.length?chrom+':'+visible[0].toLocaleString()+'–'+visible[visible.length-1].toLocaleString():'No positions'} · {visible.length} visible columns · fits your display</p>
 <label className="data-label">Browse selected range<input className={styles.slider} type="range" min={0} max={Math.max(0,total-1)} value={first} disabled={!total} aria-valuetext={visible.length?'Chromosome position '+visible[0]:'No positions'} onChange={e=>setWindowStart(+e.target.value)}/></label>
 <p role="status">{navigationMessage}</p>
 <div role="region" aria-label="Scrollable chromosome genotype alignment" tabIndex={0} className={styles.scroll}>
 <table className={styles.table}>
 <caption style={{textAlign:'left'}}>Original 1-based genomic coordinates. Insertions/deletions are displayed as allele strings at their VCF anchor, not expanded into a reconstructed alignment.</caption>
 <thead><tr><th style={{minWidth:labelWidth,maxWidth:labelWidth}}>Track / position</th>{visible.map(p=><th key={p} style={{minWidth:size}}>{p.toLocaleString()}</th>)}</tr></thead>
 <tbody><tr><th>Variant marker</th>{visible.map(p=><td key={p} title={(byPosition.get(p)??[]).map(v=>v.id+' '+v.ref+' → '+v.alt).join('; ')}>{byPosition.has(p)?'◆':'—'}</td>)}</tr>
 <tr><th>Reference DNA</th>{visible.map(p=><td key={p}>{refAt(p)}</td>)}</tr>
 <tr><th>Cohort consensus</th>{visible.map(p=><td key={p}>{consensus(p)}</td>)}</tr>
 {samples.map((s,i)=><tr key={s}><th title={s}>{s}</th>{visible.map(p=><td key={p} style={{minWidth:size,padding:8,fontFamily:'monospace',textAlign:'center',border:'1px solid #42616b',background:byPosition.has(p)?'#183a42':'transparent',overflowWrap:'anywhere'}}>{callAt(p,i)}</td>)}</tr>)}
 </tbody></table></div>
 {!total&&<p>No variant positions in this range. Full reference mode can still display the reference DNA.</p>}
 <div className={styles.navigation}><Button variant="outline" disabled={first===0} onClick={()=>setWindowStart(Math.max(0,first-columns))}>← Previous</Button><span>{total?first+1:0}–{Math.min(total,first+columns)} of {total.toLocaleString()} positions</span><Button variant="outline" disabled={first+columns>=total} onClick={()=>setWindowStart(first+columns)}>Next →</Button></div>
 </>}
 </section>;
}
