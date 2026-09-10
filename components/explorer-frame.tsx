"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WORKSPACES, type WorkspaceId } from '@/lib/workspaces';
import { TEMPLATES } from '@/lib/data-catalog';
import { useDataSession } from './data-session';
import { DatasetPreview } from './dataset-preview';
import { ProteinWorkbench } from './protein-workbench';
import {MetaboliteWorkbench} from './metabolite-workbench';
import {MetabolomeStructureExplorer} from './metabolome-structure-explorer';
import {Tabs,TabsList,TabsTrigger} from './ui/tabs';
import {EpigenomeStructureExplorer} from './epigenome-structure-explorer';
import { DataHub } from './data-hub';
export function ExplorerFrame({module='cell'}:{module?:WorkspaceId}) {
 const {datasets}=useDataSession();const [demo,setDemo]=useState(false);const [selected,setSelected]=useState('');const [mMode,setMMode]=useState('library');
 const workspace=WORKSPACES.find(w=>w.id===module)!;
 if(module==='loader')return <DataHub/>;
 const available=datasets.filter(d=>d.category===module&&d.status==='ready');
 const blocked=datasets.filter(d=>d.category===module&&d.status!=='ready');
 const active=available.find(d=>d.id===selected)||available[0];
 const templates=TEMPLATES.filter(t=>t.category===module);
 return <section className="explorer-workspace"><header className="explorer-heading"><div><h1>{workspace.label}</h1><p>{module==='cell'?workspace.detail:'Inspect your imported data or explicitly open a synthetic teaching example.'}</p></div><span className="scope-badge">{module==='cell'||demo||(['epigenome','metabolome'].includes(module)&&mMode==='library')?'Teaching example':active?(active.source==='sample'?'Synthetic sample':'Imported data'):'No ready data'}</span></header>
 {module==='epigenome'&&<><Tabs value={mMode} onValueChange={v=>{setMMode(v);setDemo(false);}}><TabsList className="workspace-mode-tabs"><TabsTrigger value="library">Epigenome teaching atlas</TabsTrigger><TabsTrigger value="tables">My data & original demos</TabsTrigger></TabsList></Tabs>{mMode==='library'&&<EpigenomeStructureExplorer/>}</>}
 {module==='proteome'&&<ProteinWorkbench/>}
 {module==='metabolome'&&<><Tabs value={mMode} onValueChange={v=>{setMMode(v);setDemo(false);}}><TabsList className="workspace-mode-tabs"><TabsTrigger value="library">Compound library</TabsTrigger><TabsTrigger value="uploads">My structures & motion</TabsTrigger><TabsTrigger value="tables">Data tables & original demos</TabsTrigger></TabsList></Tabs>{mMode==='library'&&<MetabolomeStructureExplorer/>}{mMode==='uploads'&&<MetaboliteWorkbench/>}</>}
 {module!=='cell'&&!demo&&(!['metabolome','epigenome'].includes(module)||mMode==='tables')&&<div className="module-data"><div className="data-section-title"><Link href="/explore/loader" className="data-open">Upload data & samples →</Link><Button variant="outline" onClick={()=>setDemo(true)}>View teaching demo</Button></div>{active?<><label className="data-label">Dataset<select value={active.id} onChange={e=>setSelected(e.target.value)}>{available.map(d=><option key={d.id} value={d.id}>{d.name} ({d.source})</option>)}</select></label><DatasetPreview key={active.id} dataset={active}/></>:<div className="data-empty"><Database size={32}/><h2>No {workspace.label.toLowerCase()} data ready</h2><p>{blocked.length?`${blocked.length} file(s) need attention. Review the messages below to prepare them.`:'Upload a matching processed file to inspect your own measurements here.'}</p>{templates.length>0&&<p>Start with {templates.slice(0,3).map(t=>t.filename).join(', ')} from the sample library.</p>}<Link className="data-open" href="/explore/loader">Choose a file or sample →</Link></div>}{blocked.map(d=><div className="data-notice" key={d.id}><strong>{d.name}: </strong>{d.message}<p>{d.nextStep}</p></div>)}</div>}
 {(module==='cell'||demo)&&<>{module!=='cell'&&<div className="module-demo-notice"><span>This demonstration uses synthetic data, independent of your uploads.</span><Button variant="outline" onClick={()=>setDemo(false)}>Back to imported data</Button></div>}<iframe key={module} className="explorer-frame" title={workspace.label} src={`/explorer/index.html?embedded=1#${module}`} sandbox="allow-scripts allow-downloads"/></>}
 </section>;
}
