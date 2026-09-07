# Architecture

## Navigation model

Cell organelle → biological layer → experimental assay → raw/standard file → processed feature → visualization → cross-omics link.

## Recommended production architecture

```text
Browser UI
  |
  +-- lightweight text parsing + visualization
  |
  +-- API gateway
       |
       +-- genomics service (pysam/htslib, VCF, bigWig)
       +-- single-cell service (AnnData/Scanpy)
       +-- 3D-genome service (cooler / Hi-C)
       +-- proteomics service (pyteomics/pymzML)
       +-- structures service (mmCIF/PDB)
       +-- imaging service (OME-Zarr)
       +-- graph/integration service
```

A common entity registry should use stable identifiers (gene, transcript, protein, metabolite, sample, genomic interval) so layers can be linked rather than displayed as isolated dashboards.
