"use client";

import { useEffect, useMemo, useState } from "react";
import { Atom, Dna, Layers3, Microscope, Play, Pause, Rotate3D, Search, Sparkles } from "lucide-react";
import { DNA_MODIFICATION_BY_ID, DNA_MODIFICATIONS, EPIGENOME_KNOWLEDGE, type DnaModification } from "@/lib/epigenome-structures";

import { BaseStructureGlyph } from "./nucleobase-viewer";

type ViewMode = "sequence" | "2d" | "3d" | "4d" | "tracks" | "registry";

const BASE_COLORS: Record<string, string> = { A: "#80b7ff", C: "#61d1b2", G: "#f3bc67", T: "#e985a4", U: "#d59bea", N: "#94a3ad" };
const categories = ["All", ...Array.from(new Set(DNA_MODIFICATIONS.map((m) => m.category)))];

function BaseRing({ base, mod }: { base: string; mod: DnaModification }) {
 return <div className="epi-parent-chem"><h4>Parent nucleobase</h4>{"ACGT".includes(base)&&base.length===1?<BaseStructureGlyph base={base} mode="2d"/>:<p>This lesion removes a base or links multiple sites; no single parent-base structure applies.</p>}<div className="epi-change" style={{borderColor:mod.color}}><b style={{color:mod.color}}>Chemical change · {mod.short}</b><p>{mod.group}</p></div><p>Parent structure and modification annotation are separate. A verified atom-resolved modified structure was not supplied.</p></div>;
}
type RangeProps={start:number;end:number};
function callAt(position:number){return EPIGENOME_KNOWLEDGE.exampleCalls.find(c=>position>=c.position&&position<c.position+(c.span||1));}
function SequenceView({ selectedId, setSelectedId, start, end }: { selectedId: string; setSelectedId: (id:string)=>void } & RangeProps) {
  const seq = EPIGENOME_KNOWLEDGE.sequence.sequence;
  const calls = EPIGENOME_KNOWLEDGE.exampleCalls;
  const callAt = new Map<number, (typeof calls)[number]>();
  calls.forEach((c)=>{ callAt.set(c.position,c); if(c.span && c.span>1) for(let i=1;i<c.span;i++) callAt.set(c.position+i,c); });
  return <div className="epi-sequence-panel">
    <div className="epi-ruler"><span>{start}</span><span>1-based inclusive · forward strand</span><span>{end}</span></div>
    <div className="epi-sequence-grid">{seq.slice(start-1,end).split("").map((base,index)=>{
      const pos=index+start; const call=callAt.get(pos); const mod=call?DNA_MODIFICATION_BY_ID.get(call.modification):undefined;
      return <button key={pos} title={mod?`${pos}: ${mod.name}`:`${pos}: ${base}`} disabled={!mod} onClick={()=>mod&&setSelectedId(mod.id)} className={mod?.id===selectedId?"selected":""} style={{borderColor:mod?.color||"transparent"}}>
        <span style={{color:BASE_COLORS[base]}}>{base}</span><small>{pos}</small>{mod&&<i style={{background:mod.color}}>{mod.short}</i>}
      </button>;
    })}</div>
    <div className="epi-sequence-legend"><span><b className="epi-dot epigenetic"/>Epigenetic/base marks</span><span><b className="epi-dot damage"/>Damage/adduct examples</span><span>Click a modified base to inspect its chemistry.</span></div>
  </div>;
}

function HelixView({selectedId,setSelectedId,state=0,start,end}:{selectedId:string;setSelectedId:(id:string)=>void;state?:number}&RangeProps){
 const [rotation,setRotation]=useState(25),[zoom,setZoom]=useState(1);
 const points=EPIGENOME_KNOWLEDGE.helix.filter(p=>p.position>=start&&p.position<=end);
 const angle=rotation*Math.PI/180;
 const project=(p:(typeof points)[number])=>({x:450+((p.position-(start+end)/2)*Math.min(24,740/Math.max(1,end-start))+(p.x*Math.sin(angle)+p.y*Math.cos(angle))*1.6)*zoom,y:190+(p.y*Math.sin(angle)-p.x*Math.cos(angle))*7*zoom*(1-state*.3)});
 return <div className="epi-helix-stage"><div className="epi-state-controls"><label>Rotate <input aria-label="Rotate DNA" type="range" min="0" max="360" value={rotation} onChange={e=>setRotation(+e.target.value)}/></label><label>Zoom <input aria-label="Zoom DNA" type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label><button onClick={()=>{setRotation(25);setZoom(1)}}>Fit range</button></div><svg viewBox="0 0 900 410" className="epi-helix-svg" role="img" aria-label="Rotatable idealized B-DNA projection, colored modification positions">
 {[1,2].map(strand=><path key={strand} className={`epi-backbone strand-${strand}`} d={points.filter(p=>p.strand===strand).map((p,i)=>{const q=project(p);return `${i?'L':'M'} ${q.x} ${q.y}`}).join(' ')}/>)}
 {points.filter(p=>p.strand===1).map(p=>{const mate=points.find(m=>m.strand===2&&m.position===p.position)!;const a=project(p),b=project(mate),c=callAt(p.position),mod=c?DNA_MODIFICATION_BY_ID.get(c.modification):undefined;return <g key={p.position}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="epi-basepair"/><circle cx={b.x} cy={b.y} r={3} fill={BASE_COLORS[mate.base]}/><circle cx={a.x} cy={a.y} r={mod?.id===selectedId?8:mod?6:3} fill={mod?.color||BASE_COLORS[p.base]} onClick={()=>mod&&setSelectedId(mod.id)}><title>{p.position}: {p.base}{mod?' · '+mod.name:''}; coarse base marker, no atom coordinates</title></circle>{mod&&<text x={a.x} y={a.y-14} className="epi-helix-label">{p.position} {mod.short}</text>}</g>})}</svg><p>Idealized B-DNA coordinates. Markers represent bases, not atoms. Rotate and zoom to inspect the selected interval; exact modified atomic geometry is unavailable.</p></div>;
}
function TrackView({start,end}:RangeProps){
 const overlap=(b:{start:number;end:number})=>b.end>=start&&b.start<=end;
 const hic=EPIGENOME_KNOWLEDGE.hic;const visible=hic.bins.map((b,i)=>({...b,i})).filter(overlap);
 return <div className="epi-track-stack"><p>Synthetic teaching signals. Entire bins overlapping {start}–{end} are shown; values are not recomputed for partial bins.</p>
 {EPIGENOME_KNOWLEDGE.tracks.map(t=><div key={t.id} className="epi-track-row"><div><strong>{t.label}</strong><small>{t.unit} · scale 0–{t.id==='methylation'?1:Math.max(...t.values)}</small></div><div className="epi-track-bars">{t.values.map((v,i)=>overlap(t.bins[i])&&<span key={i} tabIndex={0} aria-label={`${t.label}, positions ${t.bins[i].start}–${t.bins[i].end}: ${v} ${t.unit}`} title={`${t.bins[i].start}–${t.bins[i].end}: ${v} ${t.unit}`} style={{height:`${v/(t.id==='methylation'?1:Math.max(...t.values))*100}%`}}/>)}</div></div>)}
 <div className="epi-hic-card"><strong>Hi-C contact map · {hic.unit}</strong><p>Rows and columns use the same sequence bins. Contact intensity does not specify a unique 3D conformation.</p><div className="epi-hic-grid" style={{gridTemplateColumns:`repeat(${visible.length},1fr)`}}>{visible.flatMap(r=>visible.map(c=><span key={`${r.i}-${c.i}`} tabIndex={0} aria-label={`${r.start}–${r.end} × ${c.start}–${c.end}: ${hic.matrix[r.i][c.i]}`} title={`${r.start}–${r.end} × ${c.start}–${c.end}: ${hic.matrix[r.i][c.i]}`} style={{opacity:hic.matrix[r.i][c.i]/80}}/>))}</div><p>Bin intervals: {visible.map(b=>`${b.start}–${b.end}`).join(', ')}. Scale: 0–80.</p></div><p>{EPIGENOME_KNOWLEDGE.provenance.assayNote}</p></div>;
}

export function EpigenomeStructureExplorer() {
  const [start,setStart]=useState(1),[end,setEnd]=useState(EPIGENOME_KNOWLEDGE.sequence.sequence.length);
  const [view,setView]=useState<ViewMode>("sequence");
  const [selectedId,setSelectedId]=useState("5mc");
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All");
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const selected=DNA_MODIFICATION_BY_ID.get(selectedId)||DNA_MODIFICATIONS[0];
  const visible=useMemo(()=>DNA_MODIFICATIONS.filter(m=>(category==="All"||m.category===category)&&(`${m.name} ${m.short} ${m.base} ${m.group} ${m.roles.join(" ")} ${m.enzymes.join(" ")} ${m.assays.join(" ")}`.toLowerCase().includes(query.toLowerCase()))),[query,category]);
  useEffect(()=>{if(!playing||view!=="4d")return;const timer=setInterval(()=>setFrame(n=>(n+1)%5),1200);return ()=>clearInterval(timer);},[playing,view]);
  const setPlay=()=>setPlaying(p=>!p);
  const views:[ViewMode,string,React.ReactNode][]=[
    ["sequence","Sequence",<Dna key="a" size={14}/>],["2d","2D chemistry",<Atom key="b" size={14}/>],["3d","3D DNA",<Rotate3D key="c" size={14}/>],["4d","4D states",<Layers3 key="d" size={14}/>],["tracks","Epigenomic tracks",<Sparkles key="e" size={14}/>],["registry","Modification registry",<Microscope key="f" size={14}/>]
  ];
  return <section className="epigenome-structure-explorer">
    <header className="epi-header"><div><span className="epi-kicker">v6 · sequence → chemistry → chromatin</span><h2>Epigenome & DNA Structures</h2><p>Explore covalent DNA modifications at nucleotide, molecular, helix, chromatin-state and assay levels. Epigenetic marks and DNA damage/adducts are intentionally labeled separately.</p></div><div className="epi-count">{DNA_MODIFICATIONS.length} representative modification types</div></header>
    <div className="epi-tabs">{views.map(([id,label,icon])=><button key={id} aria-pressed={view===id} onClick={()=>{setView(id);setPlaying(false)}} className={view===id?"active":""}>{icon}{label}</button>)}</div>
    <div className="epi-range"><b>Synthetic teaching sequence · {EPIGENOME_KNOWLEDGE.sequence.sequence.length} bp</b><label>Start <input aria-label="Sequence start" type="number" min="1" max={end} value={start} onChange={e=>setStart(Math.max(1,Math.min(end,Math.trunc(Number(e.target.value)||1))))}/></label><label>End <input aria-label="Sequence end" type="number" min={start} max={EPIGENOME_KNOWLEDGE.sequence.sequence.length} value={end} onChange={e=>setEnd(Math.min(EPIGENOME_KNOWLEDGE.sequence.sequence.length,Math.max(start,Math.trunc(Number(e.target.value)||start))))}/></label><button onClick={()=>{setStart(1);setEnd(20)}}>1–20</button><button onClick={()=>{setStart(1);setEnd(EPIGENOME_KNOWLEDGE.sequence.sequence.length)}}>Full sequence</button><a href="/data/knowledge/epigenome-structures.json" download>Download all teaching data (JSON)</a><a href="/data/epigenome/teaching-dna.fasta" download>FASTA</a><a href="/data/epigenome/modification-calls.tsv" download>Modification calls TSV</a><a href="/data/epigenome/tracks.tsv" download>Tracks TSV</a><p>No participant, tissue or measured single-cell/bulk data is attached to this example. Use “My data & original demos” for imported measurements.</p></div>
    <div className="epi-main">
      <aside className="epi-library"><div className="epi-search"><Search size={13}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search modifications, roles, enzymes and assays" placeholder="Search marks, enzymes, assays…"/></div><select aria-label="Modification category" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><div className="epi-mod-list">{!visible.length&&<p>No matches. Clear the search or choose All categories.</p>}{visible.map(mod=><button key={mod.id} onClick={()=>setSelectedId(mod.id)} className={selectedId===mod.id?"active":""}><i style={{background:mod.color}}/><span><strong>{mod.short}</strong><small>{mod.name}</small></span><b>{mod.base}</b></button>)}</div></aside>
      <div className="epi-workbench">
        <div className="epi-selected-head"><div><span style={{color:selected.color}}>{selected.short}</span><h3>{selected.name}</h3><p>{selected.category}</p></div><div className="epi-formula"><b>{selected.formula}</b><small>{selected.deltaMass==null?"Δ mass varies / structural lesion":`Δ mass ${selected.deltaMass.toFixed(5)} Da`}</small></div></div>
        {view==="sequence"&&<SequenceView selectedId={selectedId} setSelectedId={setSelectedId} start={start} end={end}/>} 
        {view==="2d"&&<div className="epi-chem-layout"><BaseRing base={selected.base.length===1?selected.base:"N"} mod={selected}/><div className="epi-chem-facts"><div><b>Modification</b><span>{selected.group}</span></div><div><b>SMILES / representation</b><code>{selected.smiles||"No verified matching SMILES supplied. Original strings are preserved in the import audit."}</code></div><div><b>Biological role</b><span>{selected.roles.join(" · ")}</span></div></div></div>}
        {view==="3d"&&<HelixView start={start} end={end} setSelectedId={setSelectedId} selectedId={selectedId}/>}
        {view==="4d"&&<div><div className="epi-state-controls"><button onClick={setPlay}>{playing?<Pause size={13}/>:<Play size={13}/>} {playing?"Pause":"Play states"}</button><input aria-label="Teaching state" type="range" min="0" max="4" value={frame} onChange={e=>setFrame(Number(e.target.value))}/><span>State {frame+1}/5</span></div><HelixView start={start} end={end} setSelectedId={setSelectedId} selectedId={selectedId} state={frame/4}/><div className="epi-state-story" aria-live="polite"><div className="epi-state-symbol">{["DNA", "+ mark", "Reader ↔ mark", "Nucleosome", "Repair ↔ DNA"][frame]}</div><p>{["Accessible DNA can be contacted by regulatory proteins. Accessibility alone does not identify a specific mark.","A writer adds a covalent mark at a compatible site. The selected registry entry describes candidate enzymes.","Recognition depends on the mark, reader and biological context. No binding affinity is inferred here.","DNA can wrap around histones and form compact chromatin. This schematic is not a chromatin folding calculation.","Remodelers can alter accessibility; lesion-specific repair systems can remove damage. These processes are distinct."][frame]}</p></div><div className="epi-state-caption"><b>{["Accessible B-DNA","mark deposition","reader recruitment","locally compacted chromatin","remodeling / repair state"][frame]}</b><span>These are alternative illustrative states, not an inevitable biological sequence. 4D is a teaching state/ensemble view. It is not a molecular-dynamics trajectory or time-resolved experiment.</span></div></div>}
        {view==="tracks"&&<TrackView start={start} end={end}/>}
        {view==="registry"&&<div className="epi-registry-table"><table><thead><tr><th>Mark/lesion</th><th>Parent</th><th>Category</th><th>Chemical change</th><th>Biological roles</th><th>Enzymes / repair</th><th>Example assays</th></tr></thead><tbody>{visible.map(m=><tr key={m.id} onClick={()=>setSelectedId(m.id)}><td><button onClick={()=>setSelectedId(m.id)} style={{color:m.color}}>{m.short}</button><span>{m.name}</span></td><td>{m.base}</td><td>{m.category}</td><td>{m.group}</td><td>{m.roles.join("; ")}</td><td>{m.enzymes.join(", ")}</td><td>{m.assays.join(", ")}</td></tr>)}</tbody></table></div>}
        <p className="epi-range">Selected mark in this interval: {EPIGENOME_KNOWLEDGE.exampleCalls.filter(c=>c.modification===selectedId&&c.position<=end&&c.position+(c.span||1)-1>=start).map(c=>c.position).join(", ")||"No example calls. Registry information remains available; absence here is not evidence of biological absence."}</p><footer className="epi-detail-footer"><div><b>Selected biology</b>{selected.roles.map(r=><span key={r}>• {r}</span>)}</div><div><b>Enzymes / repair</b>{selected.enzymes.map(r=><span key={r}>• {r}</span>)}</div><div><b>Compatible assay examples</b>{selected.assays.map(r=><span key={r}>• {r}</span>)}</div></footer>
      </div>
    </div>
    <details className="epi-scope"><summary>What “all DNA modifications” means in this software</summary><p>The bundled registry is representative, not chemically exhaustive. It includes major cytosine oxidation states, adenine/cytosine methylation, oxidative lesions, deamination products, alkylation adducts, UV photoproducts, abasic sites, bulky adducts and crosslinks. The schema is extensible so future database/data-lake records can add arbitrary new modifications, structures, assay evidence and sequence positions without changing the viewer.</p></details>
  </section>;
}
