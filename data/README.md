# Data organization

`data/` is the authoritative data layer for Cell Omics Explorer.

- `catalog/` — dataset and collection metadata. No biological payload duplication.
- `datasets/teaching-v3/` — the 24 current synthetic teaching datasets, grouped by omics domain.
- `datasets/legacy-v2/` — the 12 unique legacy datasets preserved from the original explorer.
- `knowledge/` — reusable teaching/visualization models that used to be embedded in TypeScript.
- `provenance/` — SHA-256 hashes and the original→canonical migration map.

`public/data/` is deliberately **not authoritative**. `npm run data:materialize` creates it from the catalog for browser download/fetch. It can be deleted and regenerated at any time.

This gives the project a database/data-lake friendly contract: UI code resolves a dataset by catalog ID and storage adapter rather than knowing where the bytes are physically stored.


## Metabolome chemical structure knowledge model

`knowledge/metabolome-structures.json` is the canonical v5 teaching structure library. It stores molecule identity, formula/SMILES, 2D atoms/bonds, generated 3D conformer coordinates, adducts, an approximate isotope envelope, pathway annotations and scientific-boundary metadata. It is not a duplicate sample payload and is intentionally separated from `datasets/` so a future database/data lake can provide the same structure records through an adapter.
