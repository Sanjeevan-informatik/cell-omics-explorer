# Data import and format support

The native React upload workspace replaces the old single-file preview. Select the destination category before uploading tables. FASTA, VCF and BED route to Genome & variants. Each file records its origin (uploaded or synthetic sample), status, format, row count, missing-value count and next action.

| Input | Current behavior |
| --- | --- |
| Aligned DNA FASTA | Validation and handoff to DNA analysis; 2–50 sequences × up to 20,000 sites |
| Four-line FASTQ | Record/base/quality validation and read preview; alignment requires external tools |
| VCF | Basic headers, record columns and positions; no full genotype/allele validation |
| BED | Nonnegative start, end greater than start; 0-based half-open intervals |
| CSV/TSV/text tables | Quoted fields, row/header checks, complete bounded table with search, pagination and CSV export |
| Tables matching catalog schemas | Additional numeric and beta/fraction range checks; no normalization |
| Gene × cell CSV/TSV + optional cell metadata | Single-cell import form: transposes to cells × genes, validates counts/units and exact cell-ID joins; optional x/y |
| 10x-style Matrix Market + features.tsv + barcodes.tsv | Single-cell form: general coordinate integer/real syntax, nonnegative integer counts, genes × cells; sparse zeros preserved |
| Single-cell JSON package | Versioned dense/CSR schema, identifiers, metadata, finite coordinates, source provenance; export and reopen |
| H5AD | Single-cell form and optional API: dense/CSR/CSC X, obs/var dataframes, categorical/nullable metadata, first two dimensions of X_umap/X_tsne/X_pca/spatial |
| Sample metadata | sample_id plus at least two recognized annotation headers; unique IDs; missing fields preserved; exact joins across omics tables |
| Other text, including PDB/mmCIF | Plain-text preview; no scientific parser |
| BAM/CRAM/BCF, bigWig/bigBed, Hi-C/Cooler, H5/loom/RDS | Recognition and conversion guidance |
| mzML/mzXML and vendor MS files | Specialist conversion guidance; no spectrum decoding |
| FCS and image files | Export-to-table guidance; no image viewer or event decoder |
| Compressed archives | Decompress externally; archive contents are never extracted |

24 synthetic examples are available under `/data/` and in `data/templates/`, including sample metadata. Public experimental PBMC3k and TCGA subsets live in separate `/data/pbmc3k/` and `/data/tcga-brca/` directories with source and processing records.

5 MiB per text file; 20 MiB single-cell JSON and parsed session state; 20 files per batch; 40 session entries. Delimited tables, VCF and BED are capped at 10,000 records. All accepted table rows are retained; display uses pages of 100, and search/export covers the full loaded table. FASTQ retains its 200-read preview. Missing values are preserved, never filled with zero. Ready means the stated parser checks passed, not that every biological claim was validated.

Single-cell limits: 10,000 cells, 5,000 genes, 1,000,000 dense or stored sparse values, 50 metadata columns per axis, eight JSON embeddings, 20 MiB converted package. Missing expression is rejected; absent entries in a validated sparse matrix mean zero by that format's definition. Duplicate coordinates/IDs and mismatched metadata are rejected. UMAP, clustering, normalization, differential expression and spatial registration are not computed.

H5AD: 32 MiB upload, with shape limits checked before reading numeric arrays. Uses the AnnData 0.8+ dataframe/sparse conventions described in the [official format specification](https://anndata.readthedocs.io/en/stable/fileformat-prose.html). Legacy compound dataframes, external/soft links, virtual/external-storage arrays, nonfinite expression, and unsupported metadata encodings are rejected with guidance. `raw`, `layers`, `uns`, graphs and other embeddings are not imported. X units remain explicitly unknown. Rewrite old files or export subsets with AnnData/Scanpy when needed.

Session datasets live in React memory across navigation and clear on reload. Single-cell package export preserves the imported matrix, metadata, supplied coordinates and provenance for reimport. CSV export escapes potential spreadsheet formula strings. Opening DNA analysis stores the alignment separately in sessionStorage. Paths refer to bundled assets. There is no arbitrary remote URL importer, folder import, durable server storage, or cross-layer statistical integration. H5AD alone is sent to the explicitly configured API, which removes temporary files after the request.
