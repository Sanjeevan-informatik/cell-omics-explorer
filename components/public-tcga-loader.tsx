'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {inspectData} from '@/lib/data-import';
import {useDataSession, type Dataset} from './data-session';
export function PublicTcgaLoader({onLoaded}:{onLoaded:(participant:string)=>void}){
 const {datasets,add}=useDataSession();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function load(){setBusy(true);setMessage('');try{
  const names=['tcga_metadata.tsv','tcga_rna.tsv','tcga_protein.tsv'];
  const missing=names.filter(name=>!datasets.some(d=>d.name===name&&d.source==='upload'));
  if(datasets.length+missing.length>40)throw new Error('Remove session files before loading this three-file dataset.');
  const items:Dataset[]=await Promise.all(missing.map(async name=>{const response=await fetch('/data/tcga-brca/'+name);if(!response.ok)throw new Error('The public example could not be downloaded. Try again or use the TSV links.');const content=await response.text();const inspection=inspectData(name,content,'multiomics');if(inspection.status!=='ready')throw new Error(name+' did not pass import inspection.');return {...inspection,id:crypto.randomUUID(),name,bytes:new Blob([content]).size,source:'upload' as const};}));
  if(datasets.reduce((n,d)=>n+d.bytes,0)+items.reduce((n,d)=>n+d.bytes,0)>20*1024*1024)throw new Error('The example would exceed the session size limit. Remove some files first.');
  add(items);onLoaded('brca_tcga_pan_can_atlas_2018|TCGA-3C-AALI');setMessage('Public TCGA example loaded. Select RNA or Proteome to inspect three measured features per specimen.');
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to load the public example.');}finally{setBusy(false);}}
 return <section className="range-workspace"><h2>Public case study · TCGA breast cancer</h2><p>Ten matched bulk tumor specimens, with RNA expression and RPPA protein measurements for ERBB2, ESR1 and PGR. These are processed experimental observations from TCGA via cBioPortal. Matching is at the source sample identifier level; it does not establish the same aliquot or individual cell.</p><Button disabled={busy} onClick={load}>{busy?'Loading public data…':'Load public TCGA data'}</Button><p>{['metadata','rna','protein'].map(name=><a key={name} style={{marginRight:'1rem'}} href={'/data/tcga-brca/tcga_'+name+'.tsv'} download>{name.toUpperCase()} TSV</a>)}<a href="/data/tcga-brca/provenance.json" download>Provenance</a></p><p><a href="https://www.cbioportal.org/study/summary?id=brca_tcga_pan_can_atlas_2018" target="_blank" rel="noreferrer">Source study</a> · <a href="/data/tcga-brca/SOURCE_LICENSE.txt">Source data notice</a></p><p>No Hi-C, sequence, atomic coordinates or time course is included for these specimens. The ten-specimen subset is a software demonstration, not a representative or clinical analysis.</p>{message&&<p role="status">{message}</p>}</section>;
}
