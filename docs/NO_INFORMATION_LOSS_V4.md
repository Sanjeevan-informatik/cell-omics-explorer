# No-information-loss migration report

The restructuring is content-preserving, not a data rewrite.

- Original sample-file instances checked: **72**
- Unique biological/sample content objects: **36**
- Canonical sample objects after restructuring: **36**
- Original content hashes missing after migration: **0**

The old duplicates were path-level copies of identical bytes. They were consolidated into one canonical object each. A generated browser-delivery copy may exist under `public/data/` while the app runs, but it is not a second source of truth.

The original UI routes, analysis code, legacy explorer, backend, tests, and v3 Unified Omics Atlas remain in the project. Reusable v3 atlas and biological-hierarchy teaching data were additionally moved out of TypeScript constants into `data/knowledge/*.json`, reducing repeated embedded data and making those models easier to replace with database/data-lake records later.
