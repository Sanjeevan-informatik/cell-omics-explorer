import {proteinSample,type Structure} from './protein-structure';
export type Modification=Structure['modifications'][number];
export const modificationColor=(m:Modification)=>m.name.toLowerCase().includes('phosph')?'#fbbf24':m.name.toLowerCase().includes('acetyl')?'#e879f9':'#2dd4bf';
export function modificationGraph(data:Structure,m:Modification){
 const component=new Set(m.atom_ids||[]);const shown=new Set(component);if(m.attachment_atom_id)shown.add(m.attachment_atom_id);
 return {atoms:data.atoms.filter(a=>shown.has(a.id)),bonds:data.bonds.filter(b=>shown.has(b.a)&&shown.has(b.b)),component};
}
export function modifiedProteinSample():Structure{
 const d=proteinSample();d.reference='synthetic-modified-peptide';d.provenance='Synthetic peptide with explicit phosphoserine S16 and acetyllysine K9 side-chain heavy atoms. Other residues are backbone-only. Hydrogens, charge states and stereochemistry are omitted. Coordinates and motion are illustrative, not energy-minimized or experimental.';
 function atom(r:number,name:string,element:string,dx:number,dy:number,dz:number){const ca=d.atoms.find(a=>a.id===`${r}:CA`)!;d.atoms.push({id:`${r}:${name}`,residue:r,name,element,x:ca.x+dx,y:ca.y+dy,z:ca.z+dz});}
 function bond(r:number,a:string,b:string,order=1){d.bonds.push({a:`${r}:${a}`,b:`${r}:${b}`,order});}
 atom(16,'CB','C',0,2,0);atom(16,'OG','O',0,4,0);atom(16,'P','P',0,6,0);atom(16,'OP1','O',-2,7,0);atom(16,'OP2','O',2,7,0);atom(16,'OP3','O',0,6,2);
 bond(16,'CA','CB');bond(16,'CB','OG');bond(16,'OG','P');bond(16,'P','OP1',2);bond(16,'P','OP2');bond(16,'P','OP3');
 for(const [i,name] of ['CB','CG','CD','CE','NZ'].entries()){atom(9,name,name==='NZ'?'N':'C',0,-(i+1)*1.8,i%2);bond(9,i===0?'CA':['CB','CG','CD','CE'][i-1],name);}
 atom(9,'AC','C',0,-11,0);atom(9,'AO','O',-2,-12,0);atom(9,'AM','C',2,-12,0);bond(9,'NZ','AC');bond(9,'AC','AO',2);bond(9,'AC','AM');
 d.modifications=[{residue:16,name:'Phosphorylation',evidence:'Synthetic phosphoserine connectivity; phosphate heavy atoms explicitly supplied. Neutral-acid bond representation; protonation not modeled.',atom_ids:['16:P','16:OP1','16:OP2','16:OP3'],attachment_atom_id:'16:OG'},{residue:9,name:'Acetylation',evidence:'Synthetic Nε-acetyllysine connectivity; acetyl heavy atoms explicitly supplied.',atom_ids:['9:AC','9:AO','9:AM'],attachment_atom_id:'9:NZ'}];
 d.frames=Array.from({length:16},(_,i)=>({time:i,positions:d.atoms.map(a=>[a.x+Math.sin(i*.3+a.residue*.2)*1.2,a.y+Math.cos(i*.3+a.residue*.2)*1.2,a.z])}));return d;
}
