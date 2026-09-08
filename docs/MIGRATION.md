# Version 2 migration

Base: `79a272c248ec13264792ef56a2c6a2f9fdc76b8f`, the existing CellOmics Explorer.

All three supplied ZIP archives contain identical file contents. Their sorted-content SHA-256 is `bc24b7a60b3ed1ab301f1b52192445b2016b7c52cd153f049147dca480f87fd6`.

The ZIP adds the React/TypeScript alignment workbench, hierarchy, and Python analysis service. The original root `index.html`, `app.js`, and `styles.css` move to `public/explorer/`; the original README is retained as `docs/ORIGINAL_EXPLORER.md` for historical context only. Original sample inputs remain in `data/`. The zero-dependency Python static server is replaced by the Node frontend development command.

The old Sites deployment identity is not copied: this is a different GitHub project. The build retains a generic hosting manifest with no registered Site ID. Dependency versions and integrity-pinned lock entries are preserved; package metadata is renamed. Build scripts no longer require executable permissions on nested shell wrappers or change the user's HOME variable.

Known remaining work: migrate teaching panels into native React modules; implement actual H5AD/BAM/Hi-C processing and imported multi-omics datasets; establish authentication, storage, job scheduling, and deployment policy if needed. These are not represented as completed functionality.
