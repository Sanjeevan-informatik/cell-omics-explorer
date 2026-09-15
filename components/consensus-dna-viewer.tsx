"use client";
import { useMemo, useRef, useState } from 'react';
import type { SequenceRecord } from '@/lib/genome-analysis';
import { consensusRegion } from '@/lib/consensus-structure';
import { Button } from '@/components/ui/button';
import styles from './consensus-dna-viewer.module.css';
const colors:Record<string,string>={A:'#38bdf8',T:'#fb7185',G:'#fbbf24',C:'#34d399',N:'#94a3b8','-':'#94a3b8'};
const LIMIT=120;
type Point={x:number;y:number;z:number};
export function ConsensusDnaViewer({records,selectedPosition,onPositionChange}:{records:SequenceRecord[];selectedPosition:number;onPositionChange:(position:number)=>void}) {
 const length=records[0]?.sequence.length??0;
 const [range,setRange]=useState({start:1,end:Math.min(length,40)});
 const [startText,setStartText]=useState('1');const [endText,setEndText]=useState(String(Math.min(length,40)));
 const [error,setError]=useState('');const [yaw,setYaw]=useState(0.4);const [tilt,setTilt]=useState(0.15);const [zoom,setZoom]=useState(1);
 const drag=useRef<{x:number;y:number;yaw:number;tilt:number}|null>(null);
 const sites=useMemo(()=>consensusRegion(records,range.start,range.end),[records,range]);
 const selected=sites.find(s=>s.position===selectedPosition+1);
 const unresolved=sites.filter(s=>!s.complement).length;
 function apply(start:number,end:number){if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>length){setError(`Enter an inclusive range between 1 and ${length}.`);return;}if(end-start+1>LIMIT){setError(`Show up to ${LIMIT} positions at once. Use Next range to explore the remainder.`);return;}setRange({start,end});setStartText(String(start));setEndText(String(end));setError('');}
 function step(direction:number){const count=range.end-range.start+1;const start=Math.max(1,Math.min(Math.max(1,length-count+1),range.start+direction*count));apply(start,Math.min(length,start+count-1));}
 function project(p:Point){const cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);const x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy;const y=p.y*ct-z*st;const depth=p.y*st+z*ct;const scale=Math.min(32,500/Math.max(8,sites.length))*zoom;return {x:380+x*scale,y:285+y*scale,z:depth};}
 // Dimensionless coarse-grained helix: one phosphate, sugar and base marker per nucleotide.
 function point(index:number,strand:number,radius:number,offset=0){const theta=index*Math.PI/5+strand*Math.PI+offset;return project({x:radius*Math.cos(theta),y:index-(sites.length-1)/2,z:radius*Math.sin(theta)});}
 const segments: {a:ReturnType<typeof project>;b:ReturnType<typeof project>;color:string;dash?:string}[]=[];
 const nodes: {p:ReturnType<typeof project>;label:string;color:string;index:number;kind:string}[]=[];
 sites.forEach((site,i)=>{if(site.gap)return;for(let strand=0;strand<2;strand++){
  const sugar=point(i,strand,2.2),phosphate=point(i,strand,2.6,0.2),base=point(i,strand,0.85);
  segments.push({a:phosphate,b:sugar,color:'#a78bfa'});
  if(i>0&&!sites[i-1].gap)segments.push({a:point(i-1,strand,2.2),b:phosphate,color:strand?'#c4b5fd':'#a78bfa'});
  const letter=strand?(site.complement??'?'):site.base;
  segments.push({a:sugar,b:base,color:colors[letter]??colors.N,dash:site.complement?undefined:'3 4'});
  nodes.push({p:phosphate,label:'P',color:'#a78bfa',index:i,kind:'Phosphate group'},{p:sugar,label:'S',color:'#f1f5f9',index:i,kind:'Deoxyribose sugar'},{p:base,label:letter,color:colors[letter]??colors.N,index:i,kind:strand?'Complementary base':'Consensus base'});
 }if(site.complement)segments.push({a:point(i,0,0.85),b:point(i,1,0.85),color:'#cbd5e1',dash:'2 4'});});
 return <section className={styles.panel} aria-labelledby="consensus-dna-title">
 <div className={styles.heading}><div><h2 id="consensus-dna-title">Consensus · continuous 3D DNA</h2><p>A connected double-strand model for a range of alignment positions.</p></div><span className={styles.badge}>Illustrative model</span></div>
 <form className={styles.controls} onSubmit={e=>{e.preventDefault();apply(Number(startText),Number(endText));}}><label>Start position<input type="number" min={1} max={length} value={startText} onChange={e=>setStartText(e.target.value)}/></label><label>End position<input type="number" min={1} max={length} value={endText} onChange={e=>setEndText(e.target.value)}/></label><Button type="submit">Show range</Button><Button type="button" variant="outline" disabled={range.start===1} onClick={()=>step(-1)}>Previous range</Button><Button type="button" variant="outline" disabled={range.end===length} onClick={()=>step(1)}>Next range</Button><Button type="button" variant="outline" onClick={()=>{const start=Math.max(1,selectedPosition-19);apply(start,Math.min(length,start+39));}}>Around selected site</Button></form>
 {error&&<p role="alert">{error}</p>}
 <p className={styles.note}>Positions {range.start}–{range.end} of {length} · {records.length} aligned sequences · {unresolved} unresolved/gap positions. These are alignment coordinates, not verified chromosome coordinates.</p>
 <div className={styles.layout}><div><div className={styles.stage}>
 <svg viewBox="0 0 760 570" aria-label="Rotatable coarse-grained consensus DNA double helix" role="img" onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,yaw,tilt};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current){setYaw(drag.current.yaw+(e.clientX-drag.current.x)*0.012);setTilt(Math.max(-1.3,Math.min(1.3,drag.current.tilt+(e.clientY-drag.current.y)*0.008)));}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
 <title>Consensus DNA coarse-grained double helix</title>
 {segments.sort((a,b)=>(a.a.z+a.b.z)-(b.a.z+b.b.z)).map((s,i)=><line key={'l'+i} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke={s.color} strokeWidth={Math.max(1,2*zoom)} strokeDasharray={s.dash} opacity={0.65}/>)}
 {nodes.sort((a,b)=>a.p.z-b.p.z).map((n,i)=><g key={i} onClick={()=>onPositionChange(sites[n.index].position-1)} style={{cursor:'pointer'}}><title>{n.kind} · alignment position {sites[n.index].position} · {n.label}</title><circle cx={n.p.x} cy={n.p.y} r={Math.max(2,Math.min(8,210/sites.length))*zoom} fill={n.color} stroke={sites[n.index].position===selectedPosition+1?'#fb923c':'#0f172a'} strokeWidth={sites[n.index].position===selectedPosition+1?3:1}/>{sites.length<=45&&<text x={n.p.x} y={n.p.y-11*zoom} fill={n.color} fontSize="11" textAnchor="middle">{n.label}</text>}</g>)}
 </svg><span className={styles.stageHint}>Drag to rotate · select a marker to inspect its position</span></div>
 <div className={styles.controls}><label>Rotate<input type="range" aria-label="Rotate DNA" min={-3.14} max={3.14} step={0.05} value={yaw} onChange={e=>setYaw(Number(e.target.value))}/></label><label>Tilt<input type="range" min={-1.3} max={1.3} step={0.05} value={tilt} onChange={e=>setTilt(Number(e.target.value))}/></label><label>Zoom<input type="range" min={0.5} max={3} step={0.1} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><Button variant="outline" onClick={()=>{setZoom(1);setYaw(0.4);setTilt(0.15);}}>Reset view</Button></div>
 </div><aside className={styles.details}><h3>{selected?`Alignment position ${selected.position}`:'Select a position'}</h3>{selected?<><p><strong>{selected.alternatives.length>1?selected.alternatives.join(' / '):selected.base}</strong> · complementary base: <strong>{selected.complement??'Unresolved'}</strong></p><p>{selected.known} / {selected.total} known DNA calls. Leading-base support: {(selected.support*100).toFixed(1)}% of known calls.</p><dl>{Object.entries(selected.counts).map(([base,count])=><div key={base}><dt>{base}</dt><dd>{count} sequences</dd></div>)}</dl></>:<p>Choose a sequence tile below, or bring the selected alignment site into view.</p>}<h3>Reading the structure</h3><p><b>P</b> = phosphate group · <b>S</b> = deoxyribose sugar. Solid links show strand connectivity; dotted links indicate base pairing. Markers represent groups, not individual atoms.</p><p>Consensus strand runs 5′ → 3′ from first to last position; its calculated complement runs 3′ → 5′.</p></aside></div>
 <div className={styles.sequence} role="group" aria-label="Consensus alignment positions">{sites.map(s=><button key={s.position} type="button" aria-label={`Position ${s.position}, consensus ${s.alternatives.join('/')||s.base}`} aria-pressed={s.position===selectedPosition+1} onClick={()=>onPositionChange(s.position-1)} style={{borderColor:colors[s.base]}}><small>{s.position}</small><strong style={{color:colors[s.base]}}>{s.alternatives.length>1?s.alternatives.join('/'):s.base}</strong></button>)}</div>
 <p className={styles.note}>Each aligned sequence contributes one vote. A/C/G/T calls determine the consensus; ties remain unresolved and N/?/gaps do not vote. All-gap columns interrupt the backbone. Other unresolved positions use neutral placeholders without assigned base pairing. The alignment table may display a single tie-breaking representative; this model retains the uncertainty.</p>
 <p className={styles.note}>This coarse-grained geometry is not an atomic structure, a measured conformation, an energy-minimized prediction, or a patient haplotype. Mixed samples can produce a consensus absent from every individual sequence. Atom-level inspection requires a corresponding PDB/mmCIF structure.</p>
 </section>;
}
