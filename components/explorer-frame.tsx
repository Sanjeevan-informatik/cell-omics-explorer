"use client";
import {useState} from 'react';
import Link from 'next/link';
import {Database} from 'lucide-react';
import {Button} from './ui/button';
import {Tabs,TabsList,TabsTrigger} from './ui/tabs';
import {WORKSPACES,type WorkspaceId} from '@/lib/workspaces';
import {TEMPLATES} from '@/lib/data-catalog';
import {useDataSession} from './data-session';
import {DatasetPreview} from './dataset-preview';
import {ProteinWorkbench} from './protein-workbench';
import {MetaboliteWorkbench} from './metabolite-workbench';
import {MetabolomeStructureExplorer} from './metabolome-structure-explorer';
import {EpigenomeStructureExplorer} from './epigenome-structure-explorer';
import {DataHub} from './data-hub';
import {RegionalGenomeReader} from './regional-genome-reader';
import {VariantSequenceExplorer} from './variant-sequence-explorer';

export function ExplorerFrame({module='cell'}:{module?:WorkspaceId}){
 const {datasets}=useDataSession();
 const native=module==='genome'?[['reference','Reference + VCF'],['alignment','Aligned DNA']]:
  module==='proteome'?[['structures','Protein structures']]:
  module==='metabolome'?[['library','Compound library'],['uploads','My structures']]:
  module==='epigenome'?[['library','Epigenome atlas']]:[];
 const initial=module==='cell'?'demo':native[0]?.[0]??'tables';
 const [mode,setMode]=useState(initial),[visited,setVisited]=useState<string[]>([initial]),[selected,setSelected]=useState('');
 const workspace=WORKSPACES.find(w=>w.id===module)!;
 if(module==='loader')return <DataHub/>;
 const available=datasets.filter(d=>d.category===module&&d.status==='ready');
 const blocked=datasets.filter(d=>d.category===module&&d.status!=='ready');
 const active=available.find(d=>d.id===selected)||available[0];
 const templates=TEMPLATES.filter(t=>t.category===module);
 const options=[...native,['tables','Imported tables'],['demo','Original teaching demo']];
 function switchView(value:string){setMode(value);setVisited(old=>old.includes(value)?old:[...old,value]);}
 const descriptions:Record<string,string>={
  reference:'Upload reference FASTA and VCF, choose a region, and compare sample genotypes.',
  alignment:'Compare variant positions in an existing aligned DNA FASTA.',
  structures:'Explore protein sequences, modifications and supplied structures.',
  library:module==='epigenome'?'Explore DNA modifications and epigenomic teaching tracks.':'Browse molecular identities, chemistry and teaching conformers.',
  uploads:'Explore your uploaded molecular structures and supplied motion frames.',
  tables:'Inspect files imported through the data loader.',
  demo:'Original demonstration with synthetic data, independent of your uploads.'
 };
 return <section className="explorer-workspace">
 <header className="explorer-heading"><div><h1>{workspace.label}</h1><p>{descriptions[mode]??workspace.detail}</p></div><Link href="/explore/loader" className="data-open">Upload data & samples →</Link></header>
 <Tabs value={mode} onValueChange={switchView}><TabsList className="workspace-mode-tabs" aria-label={workspace.label+' views'}>{options.map(([id,label])=><TabsTrigger key={id} value={id}>{label}</TabsTrigger>)}</TabsList></Tabs>
 {module==='genome'&&visited.includes('reference')&&<div hidden={mode!=='reference'}><RegionalGenomeReader/></div>}
 {module==='genome'&&visited.includes('alignment')&&<div hidden={mode!=='alignment'}><VariantSequenceExplorer/></div>}
 {module==='proteome'&&visited.includes('structures')&&<div hidden={mode!=='structures'}><ProteinWorkbench/></div>}
 {module==='epigenome'&&visited.includes('library')&&<div hidden={mode!=='library'}><EpigenomeStructureExplorer/></div>}
 {module==='metabolome'&&visited.includes('library')&&<div hidden={mode!=='library'}><MetabolomeStructureExplorer/></div>}
 {module==='metabolome'&&visited.includes('uploads')&&<div hidden={mode!=='uploads'}><MetaboliteWorkbench/></div>}
 <div hidden={mode!=='tables'} className="module-data">
 {active?<><label className="data-label">Imported dataset<select value={active.id} onChange={e=>setSelected(e.target.value)}>{available.map(d=><option key={d.id} value={d.id}>{d.name} ({d.source})</option>)}</select></label><DatasetPreview key={active.id} dataset={active}/></>:<div className="data-empty"><Database size={32}/><h2>No imported tables ready</h2><p>{blocked.length?blocked.length+' file(s) need attention. See their preparation guidance below.':'Choose a processed file or sample in the data loader to begin.'}</p><Link className="data-open" href="/explore/loader">Choose a file or sample →</Link>{templates.length>0&&<details><summary>Available sample formats</summary><p>{templates.map(t=>t.filename).join(', ')}</p></details>}</div>}
 {blocked.map(d=><div className="data-notice" key={d.id}><strong>{d.name}: </strong>{d.message}<p>{d.nextStep}</p></div>)}
 </div>
 {mode==='demo'&&<><div className="module-demo-notice"><span>Synthetic teaching data. These results are independent of uploaded files.</span><Button variant="outline" onClick={()=>switchView(native[0]?.[0]??'tables')}>Back to workspace</Button></div><iframe className="explorer-frame" title={workspace.label+' original teaching demo'} src={'/explorer/index.html?embedded=1#'+module} sandbox="allow-scripts allow-downloads"/></>}
 </section>;
}
