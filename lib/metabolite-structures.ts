import {validateStructure,type Structure} from './protein-structure';
export type MolecularAtom={id:string;element:string;x:number;y:number;z:number;x2:number;y2:number;charge?:number};
export type Molecule={id:string;name:string;category:string;formula:string;provenance:string;unit:'angstrom'|'schematic';atoms:MolecularAtom[];bonds:Structure['bonds'];interactions:Structure['interactions'];groups:{name:string;atom_ids:string[]}[];frames:Structure['frames'];timeUnit:string;has3d:boolean};
// Compatibility with the atom renderer only: no protein identity is inferred.
export function moleculeScene(d:Molecule):Structure{return {reference:d.id,sequence:'A',provenance:d.provenance,unit:d.unit,atoms:d.atoms.map(a=>({...a,name:a.id,residue:1})),bonds:d.bonds,modifications:[],interactions:d.interactions,frames:d.frames,timeUnit:d.timeUnit};}
export function validateMolecule(raw:unknown):Molecule{
 const d=raw as Molecule;if(!d||!d.id||!d.name||!d.category||!d.formula||typeof d.has3d!=='boolean'||!Array.isArray(d.atoms)||!Array.isArray(d.groups))throw Error('Molecule needs id, name, category, formula, has3d, atoms and groups.');
 validateStructure(moleculeScene(d));
 const ids=new Set(d.atoms.map(a=>a.id));for(const a of d.atoms)if(!Number.isFinite(a.x2)||!Number.isFinite(a.y2)||Math.abs(a.x2)>1e5||Math.abs(a.y2)>1e5||(a.charge!==undefined&&!Number.isInteger(a.charge)))throw Error('Each atom needs finite x2/y2 layout coordinates and an integer formal charge when supplied.');
 if(d.groups.length>500||d.groups.some(g=>!g.name||!Array.isArray(g.atom_ids)||g.atom_ids.some(id=>!ids.has(id))))throw Error('Functional groups must reference existing atom IDs.');
 if(!d.has3d&&d.frames.length)throw Error('Trajectory frames require has3d=true.');return d;
}
function make(id:string,name:string,category:string,formula:string):Molecule{return {id,name,category,formula,provenance:'Synthetic heavy-atom connectivity and illustrative coordinates. Hydrogens are implicit; stereochemistry, protonation equilibria and energy minimization are not modeled. Motion is not molecular dynamics.',unit:'schematic',atoms:[],bonds:[],interactions:[],groups:[],frames:[],timeUnit:'illustrative step',has3d:true};}
function atom(d:Molecule,id:string,element:string,x2:number,y2:number){d.atoms.push({id,element,x2,y2,x:x2/40,y:y2/40,z:Math.sin(d.atoms.length*.7)*.7});}
function bond(d:Molecule,a:string,b:string,order=1){d.bonds.push({a,b,order});}
function finish(d:Molecule){d.frames=Array.from({length:12},(_,f)=>({time:f,positions:d.atoms.map((a,i)=>[a.x+Math.sin(f*.3+i*.3)*.15,a.y+Math.cos(f*.3+i*.3)*.15,a.z+Math.sin(f*.2+i)*.1])}));return d;}
function glucose(d:Molecule,prefix:string,offset:number){
 const ring=['C1','C2','C3','C4','C5','O5'];ring.forEach((id,i)=>{const a=i*Math.PI/3;atom(d,prefix+id,id[0],offset+Math.cos(a)*75,Math.sin(a)*75);});ring.forEach((id,i)=>bond(d,prefix+id,prefix+ring[(i+1)%6]));
 for(let i=1;i<=4;i++){const a=(i-1)*Math.PI/3;atom(d,prefix+'O'+i,'O',offset+Math.cos(a)*135,Math.sin(a)*135);bond(d,prefix+'C'+i,prefix+'O'+i);}
 atom(d,prefix+'C6','C',offset-100,-140);atom(d,prefix+'O6','O',offset-155,-180);bond(d,prefix+'C5',prefix+'C6');bond(d,prefix+'C6',prefix+'O6');
}
export function metaboliteSamples():Molecule[]{
 const ethanol=make('ethanol-demo','Ethanol','Metabolite','C2H6O');atom(ethanol,'C1','C',0,0);atom(ethanol,'C2','C',65,35);atom(ethanol,'O1','O',130,0);bond(ethanol,'C1','C2');bond(ethanol,'C2','O1');ethanol.groups=[{name:'Alcohol group',atom_ids:['C2','O1']}];
 const glycerol=make('glycerol-demo','Glycerol','Lipid building block','C3H8O3');for(let i=1;i<=3;i++){atom(glycerol,'C'+i,'C',i*65,i%2*25);atom(glycerol,'O'+i,'O',i*65,i%2?95:-70);bond(glycerol,'C'+i,'O'+i);if(i>1)bond(glycerol,'C'+(i-1),'C'+i);}glycerol.groups=[{name:'Hydroxyl oxygens',atom_ids:['O1','O2','O3']}];
 const acid=make('palmitic-acid-demo','Palmitic acid','Fatty acid / lipid','C16H32O2');for(let i=1;i<=16;i++){atom(acid,'C'+i,'C',i*45,i%2*30);if(i>1)bond(acid,'C'+(i-1),'C'+i);}atom(acid,'O1','O',5,-40);atom(acid,'O2','O',-15,70);bond(acid,'C1','O1',2);bond(acid,'C1','O2');acid.groups=[{name:'Carboxylic acid head',atom_ids:['C1','O1','O2']},{name:'Hydrocarbon tail',atom_ids:Array.from({length:15},(_,i)=>'C'+(i+2))}];
 const sugar=make('glucose-ring-demo','Glucose ring connectivity','Monosaccharide','C6H12O6');glucose(sugar,'',0);sugar.groups=[{name:'Pyranose ring',atom_ids:['C1','C2','C3','C4','C5','O5']},{name:'Hydroxyl oxygens',atom_ids:['O1','O2','O3','O4','O6']}];
 const maltose=make('maltose-demo','Maltose connectivity','Disaccharide / glycan','C12H22O11');glucose(maltose,'A:',0);glucose(maltose,'B:',370);maltose.atoms=maltose.atoms.filter(a=>a.id!=='B:O4');maltose.bonds=maltose.bonds.filter(b=>b.b!=='B:O4');bond(maltose,'A:O1','B:C4');maltose.groups=[{name:'1→4 glycosidic bridge (stereochemistry omitted)',atom_ids:['A:C1','A:O1','B:C4']},{name:'First sugar unit',atom_ids:maltose.atoms.filter(a=>a.id.startsWith('A:')).map(a=>a.id)},{name:'Second sugar unit',atom_ids:maltose.atoms.filter(a=>a.id.startsWith('B:')).map(a=>a.id)}];
 const missing=make('metabolite-missing-demo','Unresolved metabolite feature','Missing structure example','Not identified');missing.has3d=false;missing.provenance='Synthetic unresolved feature. No chemical identity, atom graph or coordinates supplied.';
 return [ethanol,glycerol,acid,sugar,maltose].map(finish).concat(missing);
}
