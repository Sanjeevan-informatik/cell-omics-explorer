import type { SequenceRecord } from './genome-analysis';

export type ConsensusSite = { position: number; base: string; complement: string | null; alternatives: string[]; counts: Record<string, number>; known: number; total: number; support: number; gap: boolean };
const complements: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
/** One vote per aligned sequence; ties stay unresolved, missing calls never vote. */
export function consensusRegion(records: SequenceRecord[], start: number, end: number): ConsensusSite[] {
 const length=records[0]?.sequence.length ?? 0;
 if (!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>length) return [];
 return Array.from({length:end-start+1},(_,offset)=>{
  const position=start+offset; const counts:Record<string,number>={};
  for(const record of records){const base=(record.sequence[position-1]??'?').toUpperCase();counts[base]=(counts[base]??0)+1;}
  const known=['A','C','G','T'].reduce((n,b)=>n+(counts[b]??0),0);
  const maximum=Math.max(...['A','C','G','T'].map(b=>counts[b]??0));
  const alternatives=maximum?['A','C','G','T'].filter(b=>counts[b]===maximum):[];
  const gap=(counts['-']??0)===records.length;
  const base=alternatives.length===1?alternatives[0]:gap?'-':'N';
  return {position,base,complement:complements[base]??null,alternatives,counts,known,total:records.length,support:known?maximum/known:0,gap};
 });
}
