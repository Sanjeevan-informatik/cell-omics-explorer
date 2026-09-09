# Cell Omics Explorer v4 data architecture

## Goal

Restructure the project without losing biological information, remove authoritative duplicate files, and prepare the application for future database or data-lake storage without designing the database now.

## Source of truth

```text
data/
├── catalog/
│   ├── datasets.json
│   └── collections.json
├── datasets/
│   ├── teaching-v3/
│   │   ├── genomics/
│   │   ├── epigenomics/
│   │   ├── transcriptomics/
│   │   ├── single-cell/
│   │   ├── proteomics/
│   │   ├── metabolomics/
│   │   ├── immunomics/
│   │   ├── imaging-cytometry/
│   │   ├── pathways/
│   │   ├── evolution/
│   │   └── multi-omics/
│   └── legacy-v2/
├── knowledge/
│   ├── unified-atlas.json
│   ├── biological-hierarchy.json
│   └── legacy-explorer.json
└── provenance/
    ├── migration-map.json
    └── SHA256SUMS.txt
```

## What was deduplicated

Before restructuring, the 24 current sample files existed in both `data/templates/` and `public/data/`. The 12 legacy files existed in both `data/` and `public/explorer/data/`. That was 72 file instances for 36 unique content objects.

After restructuring, the repository has one authoritative copy for each of the 36 unique sample objects. Browser files are generated at dev/build time and ignored by version control.

## Storage abstraction

UI components no longer need to know the future physical storage technology. They use a `DatasetRepository` interface. The current `BrowserStaticDatasetRepository` fetches materialized static files. Future adapters can implement the same contract for:

- S3 / MinIO / Azure Blob / GCS
- lakehouse object tables
- PostgreSQL metadata + object storage
- institutional file stores
- signed URLs returned by the backend

Only the repository adapter and catalog resolver need to change; omics workspaces can remain unchanged.

## Catalog-first rule

Every dataset has a stable catalog record with at least:

- stable ID
- collection
- omics category
- title and description
- filename / format context
- units and expected columns where known
- canonical storage path
- browser/public path
- synthetic/teaching provenance flag

Future records can add sample, subject, assay, genome assembly, feature namespace, schema version, checksums, processing lineage, and access-control metadata without moving the UI again.

## Raw, processed, and knowledge data

The current teaching project is small, so the source tree uses collections rather than a full lake-zone hierarchy. For real data, the same catalog can later point to:

```text
lake/raw/         immutable instrument/source data
lake/standard/    normalized interoperable formats
lake/derived/     analysis outputs, matrices, embeddings, calls
lake/features/    cross-omics integrated feature tables
```

Do not copy a 50 GB BAM into multiple omics pages. Store it once, catalogue it once, and let multiple views reference the same dataset ID or derived interval service.

The retained `public/explorer/app.js` is a compatibility snapshot and still contains some teaching presentation literals. Those are not treated as authoritative datasets; canonical sample bytes and reusable v3 knowledge models live under `data/`. This avoids risking a behavioral rewrite of the legacy viewer while still removing duplicated stored dataset files.

## No-information-loss proof

`data/provenance/migration-map.json` maps every original sample-file instance to its canonical SHA-256 content. The migration verified all original hashes before removing the duplicate paths.
