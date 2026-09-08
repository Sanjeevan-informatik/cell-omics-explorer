# Format support

| Input | Current behavior | Limit / unsupported behavior |
| --- | --- | --- |
| Aligned DNA FASTA | Analysis in browser or optional API | 2–50 sequences, up to 20,000 sites |
| FASTA preview | Record/header and symbol-shape checks | No automatic alphabet or alignment inference |
| Four-line FASTQ | Header, nucleotide, quality-character and length checks | Wrapped FASTQ not supported |
| VCF | Basic header, eight-column and positive-position checks | No complete allele/genotype validation |
| CSV/TSV, BED/GTF/GFF3, MSP, PDB/mmCIF, mzML/XML | Escaped text preview only | No schema validation or binary-array decoding |
| BAM/CRAM/BCF, H5AD/H5, Hi-C/Cooler, FCS, TIFF/Zarr, bigWig | Recognized only | Requires external specialist parser |
| Compressed files | Recognized only | Decompress externally |

All text previews are capped at 5 MiB and do not update the teaching panels. The bundled examples are synthetic. The initial explorer's more expansive format list described a future production plan, not implemented parsing.
