import type { SequenceRecord } from './genome-analysis';

export function variantSequenceSites(records: SequenceRecord[]) {
  const sites = [];
  for (let index = 0; index < (records[0]?.sequence.length ?? 0); index++) {
    const counts: Record<string, number> = {};
    for (const record of records) { const base = record.sequence[index]; counts[base] = (counts[base] ?? 0) + 1; }
    const alleles = Object.keys(counts).filter(base => /^[ACGT]$/.test(base)).sort();
    if (alleles.length < 2) continue;
    const reference = records[0].sequence[index];
    const alternates = alleles.filter(base => base !== reference);
    const canonicalCount = alleles.reduce((sum, base) => sum + counts[base], 0);
    const consensus = [...alleles].sort((a,b) => counts[b] - counts[a] || a.localeCompare(b)).filter(base => counts[base] === Math.max(...alleles.map(a => counts[a]))).join('/');
    const changes = alternates.map(base => !/^[ACGT]$/.test(reference) ? 'Reference unresolved' : ['AG','GA','CT','TC'].includes(reference + base) ? 'Transition' : 'Transversion');
    sites.push({ position: index + 1, reference, alternates, counts, canonicalCount, missingCount: records.length - canonicalCount, consensus, change: [...new Set(changes)].join(' / ') });
  }
  return sites;
}

export function variantSequenceTsv(records: SequenceRecord[], sites: ReturnType<typeof variantSequenceSites>) {
  const clean = (value: string) => value.replace(/[\t\r\n]/g, ' ');
  return [['alignment_position_1_based','reference','alternates','consensus','change','canonical_calls','missing_or_gap',...records.map(r => clean(r.id))].join('\t'), ...sites.map(s => [s.position,s.reference,s.alternates.join(','),s.consensus,s.change,s.canonicalCount,s.missingCount,...records.map(r => r.sequence[s.position-1])].join('\t'))].join('\n');
}
