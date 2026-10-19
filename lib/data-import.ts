import { parseDelimited } from './delimited';
export { parseDelimited } from './delimited';
import { EXTERNAL_FORMATS, TEMPLATES, type DataCategory } from './data-catalog';
import { parseFasta } from './genome-analysis';
import { validateSingleCell, type SingleCellData } from './single-cell';
import { validateSampleMetadata } from './sample-links';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export type Inspection = { status: 'ready' | 'preview' | 'unsupported' | 'invalid'; format: string; category: DataCategory; message: string; nextStep: string; headers: string[]; rows: string[][]; rowCount: number; missing: number; templateId?: string; fasta?: string; role?: 'sample-metadata'; singleCell?: SingleCellData; };
export function inspectSingleCell(singleCell: SingleCellData): Inspection {
  const fields = [...new Set(singleCell.cells.flatMap(c => Object.keys(c.metadata)))];
  return { status: 'ready', format: 'Single-cell package', category: 'singlecell', singleCell,
    message: `${singleCell.cells.length} cells × ${singleCell.genes.length} genes; ${Object.keys(singleCell.embeddings).length} supplied embeddings.`,
    nextStep: 'Open Single cell & spatial to inspect expression, annotations and supplied coordinates.',
    headers: ['cell_id', 'sample_id', ...fields.map(k=>'obs.'+k)], rows: singleCell.cells.map(c => [c.id, c.sampleId ?? '', ...fields.map(k => String(c.metadata[k] ?? ''))]), rowCount: singleCell.cells.length, missing: singleCell.cells.reduce((n, c) => n + (c.sampleId?0:1) + fields.filter(k => c.metadata[k] == null).length, 0) };
}
export function inspectData(name: string, text: string | null, category: DataCategory): Inspection {
  const ext=name.toLowerCase().split('.').pop() || '';
  const result: Inspection={status:'preview',format:ext.toUpperCase()||'Unknown',category,message:'',nextStep:'Choose a sample template to see a supported structure.',headers:[],rows:[],rowCount:0,missing:0};
  const external=EXTERNAL_FORMATS.find(f=>(f.extensions as readonly string[]).includes(ext));
  if(external)return {...result,status:'unsupported',message:`${result.format} recognized; this format cannot be parsed here.`,nextStep:`${external.tool}: ${external.action}`};
  if(text===null)return {...result,status:'invalid',message:'File contents were not read.',nextStep:'Choose a text export under 5 MiB.'};
  try {
    text=text.replace(/^\uFEFF/,'');
    if(!text.trim())throw new Error('This file is empty.');
    if(text.includes('\0'))throw new Error('Binary content detected. Select a text export.');
    if(ext==='json') return inspectSingleCell(validateSingleCell(JSON.parse(text)));
    if(['fa','fasta','fna'].includes(ext)) {
      const records=parseFasta(text);
      return {...result,status:'ready',format:'Aligned FASTA',category:'genome',headers:['sequence','length'],rows:records.map(r=>[r.id,String(r.sequence.length)]),rowCount:records.length,fasta:text,message:`${records.length} aligned DNA sequences validated.`,nextStep:'Open DNA analysis to calculate base composition and variable sites.',templateId:'alignment'};
    }
    if(['fq','fastq'].includes(ext)) {
      const lines=text.trimEnd().split(/\r?\n/);
      if(lines.length%4)throw new Error('FASTQ needs four lines per record. Wrapped FASTQ is not supported.');
      for(let i=0;i<lines.length;i+=4)if(!lines[i].startsWith('@')||!lines[i+2].startsWith('+')||!/^[ACGTRYSWKMBDHVN]+$/i.test(lines[i+1])||lines[i+1].length!==lines[i+3].length||!/^[!-~]+$/.test(lines[i+3]))throw new Error(`FASTQ record ${i/4+1} has an invalid header, base, or quality length.`);
      return {...result,status:'preview',format:'FASTQ',rowCount:lines.length/4,message:`${lines.length/4} read records validated. Raw reads are not aligned.`,nextStep:'Align reads externally and export aligned FASTA for DNA analysis.',headers:['read','sequence','quality'],rows:Array.from({length:Math.min(lines.length/4,200)},(_,i)=>[lines[i*4].slice(1),lines[i*4+1],lines[i*4+3]])};
    }
    if(ext==='vcf') {
      const lines=text.split(/\r?\n/).filter(l=>l.trim());
      if(!lines[0].startsWith('##fileformat=VCF'))throw new Error('VCF is missing its ##fileformat header.');
      const header=lines.find(l=>l.startsWith('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO'));
      if(!header)throw new Error('VCF is missing the tab-separated #CHROM column header.');
      const rows=lines.filter(l=>!l.startsWith('#')).map(l=>l.split('\t'));
      if(rows.some(r=>r.length!==header.split('\t').length||!/^\d+$/.test(r[1])||Number(r[1])<1||!r[3]||!r[4]))throw new Error('VCF records need matching columns, REF/ALT, and positive integer positions.');
      if(!rows.length)throw new Error('VCF has no variant records.');
      if(rows.length>10_000)throw new Error('Import supports up to 10,000 variant records. Export a subset.');
      return {...result,status:'ready',category:'genome',message:`${rows.length} variants; basic structure validated.`,nextStep:'Inspect the variant table. Genotypes and alleles are not fully validated.',headers:header.slice(1).split('\t'),rows:rows,rowCount:rows.length,templateId:'variants'};
    }
    if(ext==='bed') {
      const rows=text.split(/\r?\n/).filter(l=>l.trim()&&!/^(#|track|browser)/.test(l)).map(l=>l.split('\t'));
      if(!rows.length||rows.some(r=>r.length<3||!/^\d+$/.test(r[1])||!/^\d+$/.test(r[2])||Number(r[2])<=Number(r[1])))throw new Error('BED needs chromosome, nonnegative start, and end greater than start, separated by tabs.');
      if(rows.length>10_000)throw new Error('Import supports up to 10,000 intervals. Export a subset.');
      return {...result,status:'ready',category:'genome',headers:['chrom','start','end','name'],rows:rows.map(r=>[...r.slice(0,3),r[3]||'']),rowCount:rows.length,message:`${rows.length} intervals; 0-based half-open coordinates.`,nextStep:'Confirm the reference assembly before comparing intervals.',templateId:'intervals'};
    }
    if(['csv','tsv','txt','bedgraph'].includes(ext)) {
      const records=parseDelimited(text,ext==='csv'?',':'\t');
      if(records.length<2)throw new Error('A table needs a header and at least one data row.');
      const headers=records[0].map(h=>h.trim());const rows=records.slice(1);
      if(headers.length<2||headers.some(h=>!h)||new Set(headers).size!==headers.length)throw new Error('Use at least two unique, nonempty column names.');
      if(rows.some(r=>r.length!==headers.length))throw new Error('Some rows have a different number of columns. Check the delimiter and quoting.');
      const isMetadata=headers.includes('sample_id')&&['organism','tissue','condition','batch','participant_id','assay_mode'].filter(h=>headers.includes(h)).length>=2&&!headers.some(h=>['feature','feature_id','gene','value','beta','abundance'].includes(h));
      if(isMetadata)validateSampleMetadata(headers,rows);
      if(headers.includes('value')&&headers.some(h=>['sample_id','sample'].includes(h))) {
        const valueIndex=headers.indexOf('value');
        for(const row of rows){const v=row[valueIndex].trim();if(v&&!/^(NA|N\/A|null|NaN)$/i.test(v)&&!Number.isFinite(Number(v)))throw new Error('Measurement value contains a nonnumeric value. Leave unknown values empty.');}
      }
      const template=TEMPLATES.find(t=>t.category===category&&t.columns?.every(c=>headers.includes(c)));
      const missing=rows.reduce((n,r)=>n+r.filter(v=>!v.trim()||/^(NA|N\/A|null|NaN)$/i.test(v.trim())).length,0);
      const numeric=new Set(['beta','fraction','position','start','end','count','duplicate_count','mz','intensity','rt_min','tpm','abundance','control','case','x','y','signal','expression','area_um2','mean_intensity','fold_change','CD3','CD4','CD8']);
      for(const [index,h] of headers.entries())if(template&&numeric.has(h))for(const row of rows){const v=row[index].trim();if(!v||/^(NA|N\/A|null|NaN)$/i.test(v))continue;const n=Number(v);if(!Number.isFinite(n))throw new Error(`Column ${h} contains a nonnumeric value.`);if(['beta','fraction'].includes(h)&&(n<0||n>1))throw new Error(`${h} must be between 0 and 1.`);if(!['x','y','fold_change'].includes(h)&&n<0)throw new Error(`${h} cannot be negative.`);}
      return {...result,status:'ready',headers,rows,rowCount:rows.length,missing,templateId:template?.id,...(isMetadata?{role:'sample-metadata' as const,category:'multiomics' as const}:{}),message:`${rows.length} rows loaded${missing?`; ${missing} missing values preserved`:''}. ${isMetadata?'Sample metadata validated.':template?'Matches '+template.title+'.':'Generic table; biological schema not validated.'}`,nextStep:isMetadata?'Open Multi-omics evidence to inspect sample links and missing metadata.':'Inspect all rows in the matching workspace. Values are shown as supplied; no normalization or statistical analysis is performed.'};
    }
    return {...result,message:'Text preview available; this format has no scientific parser in the app.',nextStep:'Convert to a matching CSV/TSV template for a structured table.',headers:['text'],rows:text.split(/\r?\n/).slice(0,80).map(l=>[l.slice(0,500)]),rowCount:text.split(/\r?\n/).length};
  } catch(error) {return {...result,status:'invalid',message:error instanceof Error?error.message:'The file could not be parsed.',nextStep:'Correct the file or download a matching sample template, then import again.'};}
}
