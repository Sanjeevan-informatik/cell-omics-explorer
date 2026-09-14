# Preservation and validation report — v3

The v3 implementation was built from the supplied `cell-omics-explorer-main.zip` as an additive migration.

## Preservation check

A file-by-file comparison against the supplied ZIP found:

- **162 original files** in the source ZIP.
- **0 original files removed** in v3.
- Existing scientific data examples under `data/` are retained.
- The legacy teaching engine under `public/explorer/` is retained.
- The optional FastAPI backend under `backend/` is retained.
- Existing DNA analysis, sequence map, hierarchy, upload/session and omics workspace source files are retained.

Only integration/meta files were intentionally edited: the navigation, global stylesheet, page metadata, README, and package version metadata. New atlas source/docs/tests were added.

## Validation completed in the build workspace

- Focused offline TypeScript syntax/type check for the new atlas and its data/session dependencies: **passed**.
- Loader + v3 preservation/model tests runnable without external npm packages: **8/8 passed**.
- Python backend source compilation (`compileall`): **passed**.
- Original data, legacy explorer and backend bytes compared against the supplied ZIP: **no changes detected at comparison time**.

## Validation limitation

A clean `npm ci` dependency installation could not complete in the execution environment because package retrieval stalled. Therefore the full repository `npm run typecheck`, complete Vite-dependent test suite, lint and production build were not claimed as executed successfully here. Run the standard validation commands after installing dependencies in an environment with npm registry access.
