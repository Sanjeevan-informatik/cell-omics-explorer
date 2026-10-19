# Real-data workflows

## Try the public examples

1. Open **Upload data & samples**.
2. Choose **Load real PBMC data**, then **Open single-cell**. Select a gene, change Color by to gene value, switch the supplied UMAP/t-SNE embedding, search cell annotations, or select a cell in the table. Group summaries use the loaded values and original units.
3. Choose **Export reopenable dataset** to save all loaded single-cell data. Upload the JSON through Choose files to reopen it. The session itself clears on refresh.
4. Return to uploads, load **matched TCGA data**, and open **sample links**. Each of ten samples connects three RNA and three protein observations, retaining their distinct units. The subset is for inspecting software, not representative cohort inference.

PBMC attribution and reproduction: [source notes](../public/data/pbmc3k/README.md). TCGA selection, original endpoint records and checksums: [provenance](../public/data/tcga-brca/provenance.json), [data notice](../public/data/tcga-brca/SOURCE_LICENSE.txt). PBMC sample metadata intentionally leaves unprovided batch/assembly/donor identifiers blank. TCGA has no matched single-cell data, DNA sequence, epigenome, time course or experimental structure in this bundle.

## Import your single-cell tables

Expand **Import a single-cell expression dataset**. The expression CSV/TSV uses genes as rows and cells as columns:

```csv
gene,C1,C2
CD3D,2,0
MS4A1,0,4
```

Choose the measurement scale and unit accurately. The optional metadata file has one row per cell; row order may differ from the expression matrix:

```csv
cell_id,sample_id,x,y,cluster
C2,S1,3.1,2.5,B
C1,S1,0.2,1.4,T
```

`x` and `y` are optional supplied coordinates and must both be complete if included. Without coordinates, expression and annotations still work. No embedding is fabricated. Metadata must match the full cell-ID set. Missing expression is an error; unknown metadata stays missing.

For 10x-style data, select Matrix Market, then choose the uncompressed `matrix.mtx`, `features.tsv` (or older genes.tsv), and `barcodes.tsv`. Features and barcodes have no header. The matrix is genes × cells with nonnegative integer counts; mixed non-RNA feature types are rejected. Optional metadata joins by barcode. This reader supports a bounded subset, not an entire large atlas.

## Import H5AD

Start the optional API using the README instructions and configure `NEXT_PUBLIC_API_BASE_URL`. Choose H5AD in the single-cell form and **Import via configured API**. The destination is shown before the action. The reader supports dense, CSR and CSC `X`, obs/var metadata (including categorical missing codes), and supplied `X_umap`, `X_tsne`, `X_pca`, or `spatial` coordinates. Only their first two dimensions are retained. X units remain unknown; expression means are shown as supplied and detection fractions are suppressed for unknown/scaled values.

The package does not retain raw/layers/graphs/uns or arbitrary AnnData extensions. Old compound dataframe encodings require rewriting with current AnnData. Oversized datasets require a source-side subset; no cells or genes are silently dropped by the importer. See the [format support table and bounds](FORMAT_SUPPORT.md).

## Link other omics tables

Download `sample_metadata.tsv`, replace the synthetic rows and upload it. Use unique sample IDs plus annotation columns such as organism, tissue, condition, batch, assay, unit, reference_assembly and source. Include at least two of organism/tissue/condition/batch/participant_id/assay_mode so the loader recognizes the metadata role. Blank values stay unknown; use a study-specific sample ID when combining projects. The same identifier must not describe different specimens.

Upload long-form measurements with `sample_id` (or `sample`), feature, value and unit, choosing the correct omics category. Numeric wide tables whose first column is gene/gene_id/protein/feature_id can use sample IDs as the remaining headers. These IDs match exactly, including case. The linkage page reports unmatched IDs and duplicate metadata. It does not trim sample names, merge participants, average units, infer missing assays, or assert that matching source samples are the same aliquot.

## Remaining format boundaries

This implements processed-data exploration and source tracing. BAM/CRAM, bigWig, Cooler/Hi-C, vendor MS/mzML, FCS, and microscopy image decoding still require specialist conversion. Spatial coordinates can be viewed; image overlays and registration are not included. Genome assembly/feature annotation is user-supplied metadata, not an automatic reference-annotation service. No new raw-data analysis pipeline or phylogenetic functionality is introduced.
