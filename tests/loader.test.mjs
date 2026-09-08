import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/explorer/loader.js';
const { detectKind, requiresExternalParser, summarize } = globalThis.CellOmicsLoader;

test('recognizes binary and compressed files without attempting text parsing', () => {
  for (const name of ['sample.h5ad', 'contacts.mcool', 'reads.fastq.gz', 'signal.bigWig', 'sample.BAM']) assert.equal(requiresExternalParser(name), true);
  assert.equal(detectKind('contacts.cool'), 'Cooler');
});
test('FASTA rejects empty records and missing headers', () => {
  assert.throws(() => summarize('ACGT', 'FASTA'), /Invalid FASTA/);
  assert.throws(() => summarize('>a\n>b\nACGT', 'FASTA'), /empty sequence/);
  assert.equal(summarize('>a\nACGT\n>b\nACNT', 'FASTA').validated, true);
});
test('FASTQ requires valid bases and matching printable quality scores', () => {
  assert.equal(summarize('@read\nACGT\n+\nIIII\n', 'FASTQ').validated, true);
  assert.throws(() => summarize('@read\nACGT\n+\nIII', 'FASTQ'), /quality length/);
});
test('VCF rejects nonpositive positions and missing headers', () => {
  const header = '##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n';
  assert.throws(() => summarize(header + 'chr1\t0\t.\tA\tG\t.\tPASS\t.', 'VCF'), /positive integer/);
  assert.equal(summarize(header + 'chr1\t20\t.\tA\tG\t.\tPASS\t.', 'VCF').validated, true);
});
test('unvalidated and binary content cannot masquerade as parsed data', () => {
  assert.equal(summarize('x,y\n1,2', 'CSV').validated, false);
  assert.throws(() => summarize('abc\0def', 'Text'), /Binary/);
});
