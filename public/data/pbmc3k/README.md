# PBMC3k marker subset

Real experimental observations from **10x Genomics, 3k PBMCs from a Healthy Donor** (2016), processed and distributed by Scanpy/cellxgene. The 10x source dataset is **CC BY 4.0**:
https://www.10xgenomics.com/datasets/3-k-pbm-cs-from-a-healthy-donor-1-standard-1-1-0
License: https://creativecommons.org/licenses/by/4.0/

The source is Scanpy's `pbmc3k_processed` example, mirrored at:
https://raw.githubusercontent.com/chanzuckerberg/cellxgene/main/example-dataset/pbmc3k.h5ad
Source SHA256: `0db367b991dd95809732b218539ede489bea99113807f62ebd7ccc970025fe38`
This hash also appears in Scanpy's dataset registry:
https://github.com/scverse/scanpy/blob/main/src/scanpy/datasets/registry.yaml
Processing documentation: https://scanpy.readthedocs.io/en/stable/generated/scanpy.datasets.pbmc3k_processed.html

`scripts/prepare-pbmc.py` extracts 16 explicitly named markers from `raw.X`, all 2,638 source cells, source cell annotations and QC fields, and the existing UMAP/t-SNE coordinates. `raw.X` in this file contains processed log-expression, **not raw UMI counts**. It is distinct from the regressed/scaled `X`. No new normalization, clustering, embedding, imputation or rounding is performed. Original `percent_mito` is a fraction, renamed `mitochondrial_fraction` to avoid implying percent units. Source `n_counts`, `n_genes` and feature `n_cells` refer to the source assay, not the marker subset.

The sample ID `pbmc3k` is a local identifier for the one source sample. No donor identity, batch or reference assembly is inferred. Empty metadata remains empty. This deliberately small marker panel is not a complete transcriptome or a matched multi-omics cohort.

Reproduce after installing `backend/requirements.txt`:

```bash
python scripts/prepare-pbmc.py /path/to/pbmc3k.h5ad
```

The script rejects a source file whose checksum differs. `SHA256SUMS` covers the derived package. Attribution and processing details are also embedded in the package and shown in the app.
