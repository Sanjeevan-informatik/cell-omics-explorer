/* Shared by the retained teaching viewer and dependency-free parser tests. */
(function (root) {
  const MAX_BYTES = 5 * 1024 * 1024;
  const formats = { fa: 'FASTA', fasta: 'FASTA', fna: 'FASTA', fq: 'FASTQ', fastq: 'FASTQ', vcf: 'VCF', csv: 'CSV', tsv: 'TSV', txt: 'Text', mzml: 'mzML', mzxml: 'mzXML', pdb: 'PDB', cif: 'mmCIF', mmcif: 'mmCIF', sdf: 'SDF', mol: 'MOL', bam: 'BAM', cram: 'CRAM', bcf: 'BCF', h5ad: 'AnnData', h5: 'HDF5', hic: 'Hi-C', cool: 'Cooler', mcool: 'Multiresolution Cooler', fcs: 'FCS', tif: 'TIFF', tiff: 'TIFF', zarr: 'Zarr', bw: 'bigWig', bigwig: 'bigWig', bed: 'BED', gtf: 'GTF', gff3: 'GFF3', msp: 'MSP', mtx: 'Matrix Market' };
  const extension = name => name.toLowerCase().split('.').pop();
  function detectKind(name) { return formats[extension(name)] || (/\.(gz|zip|bz2|xz)$/i.test(name) ? 'Compressed file' : 'Unknown text'); }
  function requiresExternalParser(name) { return /\.(bam|cram|bcf|h5ad|h5|hic|cool|mcool|fcs|tiff?|zarr|bw|bigwig|gz|zip|bz2|xz)$/i.test(name); }
  function summarize(text, kind) {
    if (!text.trim()) throw new Error('The file is empty.');
    if (text.includes('\0')) throw new Error('Binary content cannot be previewed as text.');
    if (kind === 'FASTA') {
      const lines = text.trim().split(/\r?\n/); let count = 0, length = 0, current = 0;
      for (const raw of lines) {
        const line = raw.trim(); if (!line) continue;
        if (line.startsWith('>')) {
          if (count && !current) throw new Error('FASTA contains an empty sequence.');
          if (!line.slice(1).trim()) throw new Error('FASTA header needs an identifier.');
          count++; current = 0;
        } else {
          if (!count || !/^[A-Za-z*?.-]+$/.test(line)) throw new Error('Invalid FASTA sequence or missing header.');
          current += line.length; length += line.length;
        }
      }
      if (!current) throw new Error('FASTA contains an empty sequence.');
      return { validated: true, message: `${count} FASTA record(s), ${length} symbols. Sequence alphabet and alignment are validated separately in DNA analysis.` };
    }
    if (kind === 'FASTQ') {
      const lines = text.trimEnd().split(/\r?\n/);
      if (lines.length % 4) throw new Error('Expected four lines per FASTQ record (wrapped FASTQ is not supported).');
      for (let i = 0; i < lines.length; i += 4) {
        if (!lines[i].startsWith('@') || !lines[i + 2].startsWith('+') || !/^[ACGTRYSWKMBDHVNacgtryswkmbdhvn]+$/.test(lines[i + 1]) || !/^[!-~]+$/.test(lines[i + 3]) || lines[i + 1].length !== lines[i + 3].length) throw new Error(`Invalid FASTQ record ${i / 4 + 1}: check header, bases, and quality length.`);
      }
      return { validated: true, message: `${lines.length / 4} FASTQ record(s), sequence and quality lengths agree.` };
    }
    if (kind === 'VCF') {
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines[0].startsWith('##fileformat=VCF') || !lines.some(line => line.startsWith('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO'))) throw new Error('VCF requires fileformat and tab-separated column headers.');
      const rows = lines.filter(line => !line.startsWith('#'));
      for (const row of rows) {
        const cells = row.split('\t');
        if (cells.length < 8 || !/^\d+$/.test(cells[1]) || Number(cells[1]) < 1 || !cells[0] || !cells[3] || !cells[4]) throw new Error('VCF record needs eight columns and a positive integer position.');
      }
      return { validated: true, message: `${rows.length} VCF records; basic header, columns, and positions validated. Alleles and sample genotypes are not fully validated.` };
    }
    return { validated: false, message: `${kind}: text preview only. No schema validation or downstream analysis has been performed.` };
  }
  root.CellOmicsLoader = { MAX_BYTES, detectKind, requiresExternalParser, summarize };
})(globalThis);
