# Data import and format support

The native React upload workspace replaces the old single-file preview. Select the destination category before uploading tables. FASTA, VCF and BED route to Genome & variants. Each file records its origin (uploaded or synthetic sample), status, format, row count, missing-value count and next action.

| Input | Current behavior |
| --- | --- |
| Aligned DNA FASTA | Validation and handoff to DNA analysis; 2–50 sequences × up to 20,000 sites |
| Four-line FASTQ | Record/base/quality validation and read preview; alignment requires external tools |
| VCF | Basic headers, record columns and positions; no full genotype/allele validation |
| BED | Nonnegative start, end greater than start; 0-based half-open intervals |
| CSV/TSV/text tables | Delimited parser including quoted fields, basic row/header checks, structured preview |
| Tables matching catalog schemas | Additional numeric and beta/fraction range checks; no normalization |
| Other text, including PDB/mmCIF and Matrix Market | Plain-text preview; no scientific parser |
| BAM/CRAM/BCF, bigWig/bigBed, Hi-C/Cooler, H5AD/H5/loom/RDS | Recognition and conversion guidance |
| mzML/mzXML and vendor MS files | Specialist conversion guidance; no spectrum decoding |
| FCS and image files | Export-to-table guidance; no image viewer or event decoder |
| Compressed archives | Decompress externally; archive contents are never extracted |

30 synthetic examples are available under `/data/` and in `data/templates/`. The catalog covers aligned DNA, reads, variants, intervals, haplotypes, methylation, accessibility, Hi-C contacts, expression, isoforms, cell embeddings, spatial spots, protein abundance, MS/MS peaks, PTMs, metabolites, lipids, glycans, immune repertoire, cytometry events, image measurements, network edges, clone fractions and multi-omics evidence.

5 MiB per text file; 20 MiB total previews; 20 files per batch; 40 session entries. Delimited tables are capped at 10,000 data rows. Structured previews retain up to 200 rows and show up to 100 matching rows. Missing values are preserved, never filled with zero. Ready means the table can be inspected, not that all biological semantics are validated.

Session datasets live in React memory across application navigation and clear on reload. Opening DNA analysis stores the alignment separately in sessionStorage. Paths shown in the sample library refer only to bundled application assets, not the user's local filesystem. No remote URL fetching, folder import, server-side storage, or cross-layer statistical integration is implemented.

RNA FASTA: select Transcriptome before import; U-containing IUPAC RNA alphabet. Protein FASTA: select Proteome before import; amino-acid alphabet. These imports never trigger the aligned DNA analysis path. Participant-aware sequences must be supplied in `hierarchy_sequences.tsv` with metadata rather than assigned by filename.

The hierarchy uses matching participant_id and sample_id and exact lowercase molecule keys from the node registry. Coordinates require finite x/y/z plus unit and resolution. A time series must have one comparable unit and one value per time; mixed units or duplicate times show an explanatory message instead of silent averaging.
