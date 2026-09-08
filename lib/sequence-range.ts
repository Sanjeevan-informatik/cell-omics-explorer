import type { JoinedRow } from './hierarchy-data';
export type SequenceRange={start:number;end:number};
export function rangeError(start:number,end:number,length:number){
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return 'Use whole-number positions.';
 if(start<1||end<start)return 'Start must be at least 1 and end must be greater than or equal to start.';
 if(end>length)return `This reference ends at position ${length}.`;
 if(end-start+1>500)return 'Select up to 500 positions at a time for structure viewing.';
 return '';
}
export function mappedRows(rows:JoinedRow[],range:SequenceRange,reference:string){
 return rows.filter(r=>r.reference_id===reference&&reference!==''&&r.coordinate_system==='1-based-inclusive'&&Number.isSafeInteger(Number(r.start))&&Number.isSafeInteger(Number(r.end))&&Number(r.start)>=range.start&&Number(r.end)<=range.end&&Number(r.end)>=Number(r.start));
}
export function rangeSequence(sequence:string,range:SequenceRange){return sequence.slice(range.start-1,range.end);}
