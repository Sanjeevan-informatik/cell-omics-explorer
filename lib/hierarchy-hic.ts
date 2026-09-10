import type {DataTemplate} from './data-catalog';
export const HIC_COLUMNS=['participant_id','sample_id','assembly','chrom','start1','end1','start2','end2','count','normalization','coordinate_system'];
const rows:string[]=[];
for(const [person,sample,factor] of [['SYN001','blood_bulk',1],['SYN001','blood_T01',0.08],['SYN002','liver_bulk',1.4]] as const)for(let a=0;a<8;a++)for(let b=a;b<8;b++)rows.push([person,sample,'teaching','demo_chr1',a*10000,(a+1)*10000,b*10000,(b+1)*10000,Math.round((80/(1+b-a)+(a===2&&b===5?25:0))*factor),'raw','0-based-half-open'].join('\t'));
export const HIERARCHY_HIC:DataTemplate={id:'hierarchy-hic',category:'epigenome',title:'Participant-linked Hi-C contacts',filename:'hierarchy_hic.tsv',description:'Synthetic 10 kb contact bins for all three hierarchy specimens; not measured patient data.',units:'Synthetic contact counts; 0-based half-open bins',content:HIC_COLUMNS.join('\t')+'\n'+rows.join('\n')+'\n'};
export function contactMatrix(rows:Record<string,string>[]){
 const groups=new Set(rows.map(r=>[r.assembly,r.chrom,r.normalization,r.coordinate_system].join('|')));
 if(groups.size!==1)throw Error('Select one assembly, chromosome and normalization per file.');
 const bins=new Map<string,{start:number;end:number}>(),cells=new Map<string,number>();
 for(const r of rows){const v=['start1','end1','start2','end2','count'].map(k=>r[k]?.trim()?Number(r[k]):NaN);const [a,b,c,d,count]=v;if(r.coordinate_system!=='0-based-half-open'||v.some(n=>!Number.isSafeInteger(n)||n<0)||b<=a||d<=c)throw Error('Expected nonnegative integer counts and valid 0-based half-open bins.');
 const x=`${a}:${b}`,y=`${c}:${d}`,key=[x,y].sort().join('|');if(cells.has(key))throw Error('Duplicate or mirrored contacts found. Supply each bin pair once.');cells.set(key,count);bins.set(x,{start:a,end:b});bins.set(y,{start:c,end:d});}
 const ordered=[...bins.entries()].sort((a,b)=>a[1].start-b[1].start);if(ordered.length>100)throw Error('Export a focused region with at most 100 bins.');for(let i=1;i<ordered.length;i++)if(ordered[i][1].start<ordered[i-1][1].end)throw Error('Bins overlap; use a single binning scheme.');
 return {bins:ordered.map(([key,b])=>({...b,key})),cells};
}
