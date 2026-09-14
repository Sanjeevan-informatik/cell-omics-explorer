# Integrated CellOmics Explorer v6

The uploaded v5 archive and latest live project are integrated additively. Existing protein range selection, adaptive residue boxes, modification-atom maps, uploaded molecular JSON, mobile zoom/pan, and coordinate trajectories remain available. The incoming atlas, chemical library, dataset catalog, storage adapter contracts and knowledge objects are now part of the project.

## Workspace organization

- Unified Omics Atlas: fixed teaching fixtures with imported-file availability and links to specialized tools.
- Metabolome / Compound library: generated chemical identity, 2D depictions, conformers, conformer ensembles, ions, approximate isotope views, preserved spectrum context and pathways.
- Metabolome / My structures & motion: uploaded atom graphs, functional groups, atom inspection and actual coordinate-frame playback from the supplied bundle.
- Metabolome / Data tables & original demos: existing imported table previews and opt-in legacy teaching tools.
- Data loader: current sample library plus the canonical archive catalog, with independent download and load actions.

A conformer ensemble is not a time trajectory. The imported MS/MS example is not a validated spectrum for each library compound. Atlas selection fields record context; fixed charts do not retrieve new genomic regions or transform uploaded data.

## Preservation evidence

`data/provenance/v5-import-manifest.json` accounts for every one of the 154 input files. Unchanged imported content remains at its integrated path. Conflicting or adapted files have exact `.snapshot` copies under `data/provenance/v5-original/`. Snapshots are evidence, not executable application code. No prior sample payload was removed; its pre-integration hash is recorded in `live-samples-before-v5.json`. Earlier live source is retained by Git history.

The v5 canonical catalog remains intact with 36 datasets. Existing compatibility sample paths remain functional. The materializer copies catalog data into its namespaced browser paths and never clears the existing data directory. This release preserves rather than silently deduplicating potentially meaningful variants.

## Verification

Tests check all imported-file hashes, prior sample hashes, original catalog migration hashes, sample import behavior, chemical graph integrity and coordinate-frame correspondence. TypeScript and production build checks are required. Browser interaction testing is separate and was not requested.
