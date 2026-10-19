# CellOmics Explorer

**Live application:** [Open CellOmics Explorer](https://cell-omics-explorer.sanjeevanvive.chatgpt.site) — private to the owner; sign in with the owning account.

A cell-to-molecule teaching explorer and DNA analysis workbench, built with React, TypeScript, Vinext/Vite, and an optional Python/FastAPI service.

[![CI](https://github.com/Sanjeevan-informatik/cell-omics-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/Sanjeevan-informatik/cell-omics-explorer/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Sanjeevan-informatik/cell-omics-explorer/actions/workflows/codeql.yml/badge.svg)](https://github.com/Sanjeevan-informatik/cell-omics-explorer/actions/workflows/codeql.yml)

## Start locally

Requires Node.js 22.13+ and npm. Python 3.12 is recommended for the optional API.

```bash
git clone https://github.com/Sanjeevan-informatik/cell-omics-explorer.git
cd cell-omics-explorer
npm ci
npm run dev
```

Open **http://localhost:3000**. Choose **Upload data & samples** to import your data or load the public PBMC and matched TCGA examples. Choose **DNA analysis** for aligned FASTA. Teaching views remain explicitly labeled.

For the optional API, in another terminal:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

API docs: **http://localhost:8000/docs**. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `.env.local` and restart the frontend to use the API. Without that setting, DNA analysis runs locally in the browser. `docker compose up --build` provides an alternative full-stack setup; the container workflow is not required for browser-local analysis.

## Workspaces and actual capabilities

| Workspace | Status | What it does |
| --- | --- | --- |
| Cell explorer | Interactive teaching view | Select organelles and inspect molecules, experiments, and file families |
| DNA analysis | Implemented | Validate aligned FASTA, QC, GC composition, variants, and JSON exports |
| Sequence map | Implemented | Linked position selection and base-by-base alignment navigation |
| DNA → RNA → protein | Teaching model | Linked codons and residues with conceptual molecular views |
| Upload data & samples | Implemented, bounded | Complete small tables, single-cell matrices/packages, sample metadata and public datasets |
| Epigenome & Hi-C | Synthetic examples | Methylation table and contact-map illustration |
| Transcriptome | Imported tables + teaching examples | Full expression-table search/export; exact sample-ID links |
| Single cell & spatial | Native imported-data workspace | Gene-colored supplied embeddings, cell/gene annotations, group summaries and package export |
| Proteome & structures | Synthetic examples | MS1/MS2, peptide matches, modifications, atom-coordinate concepts |
| Metabolites/lipids/glycans | Synthetic examples | LC-MS feature and chemistry concepts |
| Immunomics | Synthetic examples | Clonotype sequences and frequencies |
| Imaging & cytometry | Synthetic examples | Microscopy and event-marker concepts |
| Pathways | Synthetic examples + imported tables | Signaling illustrations and edge-table inspection |
| Multi-omics evidence | Native sample linking | Sample metadata, linked long/wide tables, unmatched-ID coverage and separate source units |

Open **Upload data & samples** to select multiple local files, drag and drop a batch, or load any of **24 synthetic templates across 10 omics families**, including sample metadata. Templates are served from `/data/` and maintained in `data/templates/`, with a manifest describing units and expected columns.

Two separately labeled **public experimental datasets** are bundled: PBMC3k (2,638 cells, 16 selected markers and existing UMAP/t-SNE coordinates) and TCGA breast cancer (10 matched specimens, three RNA/protein features). Their source records, processing limitations and licensing notices ship with the files. Start with **Load real PBMC data → Open single-cell**, or **Load matched TCGA data → Open sample links**. See [real-data workflows](docs/REAL_DATA.md).

Ready tables appear in their selected omics workspace. Invalid files show correction guidance; binary files show specialist conversion routes. Missing data remains empty until a file or sample is selected. Teaching demos require an explicit action and remain separate from uploaded measurements. FASTA can be passed directly to DNA analysis.

Limits: 5 MiB per text file, 20 MiB single-cell JSON and parsed session data, 20 files per batch, 40 session files, and 10,000 table rows. All accepted table rows are retained, searchable and exportable, with paginated display. Single-cell matrices are bounded to 10,000 cells, 5,000 genes and 1,000,000 stored values. The optional H5AD reader accepts up to 32 MiB and uses the same matrix bounds. Files stay in browser memory and the upload list clears on refresh; export a single-cell package to reopen it later. FASTA analysis separately uses tab session storage. See [format support](docs/FORMAT_SUPPORT.md).

DNA analysis accepts 2–50 aligned sequences of up to 20,000 sites. Positions are 1-based alignment columns, not automatically mapped human reference coordinates. Only A, C, G, T, N, ?, and alignment gaps are accepted. Variable-site summaries use observed canonical bases; gaps and unknown bases remain visible in the alignment. The 30-base coding example translates to 10 amino acids within a longer protein context, not 30 amino acids. Conceptual structures are not experimentally resolved structures or folding predictions.

The optional `POST /api/v1/analyze` endpoint takes `{ "fasta": ">sample..." }` and returns records, alignment length, base composition, variable sites, and QC metrics. The JSON report uses the same result shape.

`POST /api/v1/import/h5ad` accepts a raw `application/octet-stream` H5AD body. It reads dense/CSR/CSC X, obs/var metadata, and selected supplied embeddings. The UI explicitly identifies the configured API before sending a file. Temporary server files are deleted after the request; no durable server upload store is added. This bounded reader is not a complete AnnData implementation.

## Architecture

- `app/`: React routes and shared application layout.
- `components/`: navigation, sequence workbench, hierarchy, and teaching-view adapter.
- `lib/`: pure DNA analysis, sequence workspace state, and workspace registry.
- `public/explorer/`: retained multi-omics teaching engine, isolated in a sandboxed iframe; no access to the parent page's storage.
- `backend/app/`: FastAPI contracts and scientific functions.
- `tests/`, `backend/tests/`: parser and analysis checks.
- `data/`: synthetic input examples.

The migration preserves the existing cell explorer while bringing the ZIP's larger analysis workbench into the same navigation. The teaching engine is **not yet fully ported to React**. This explicit boundary allows incremental replacement without dropping its existing views. See [architecture](docs/ARCHITECTURE.md) and [migration notes](docs/MIGRATION.md).

## Validation

```bash
npm run typecheck
npm test
npm run build
cd backend
ruff check app tests
pytest -q
```

## GitHub features

Included: frontend/backend CI, build artifacts, scheduled CodeQL scanning, Dependabot for npm/Python/Actions/Docker, CODEOWNERS, issue forms, pull-request template, release-note categories, tagged source releases gated by CI, and a Codespaces/devcontainer configuration.

Repository settings such as required reviews, branch rules, private vulnerability reporting, Discussions, and Projects are separate GitHub settings. They are not enabled by adding files. See [GitHub administration](docs/GITHUB.md). GitHub Pages cannot directly run this server-rendered frontend or FastAPI service.

## Privacy and deployment

The default workbench processes DNA in the browser. Configuring an API URL sends analysis inputs to that service. There is no patient-data platform, authentication, or durable upload store. See [security](SECURITY.md). Production infrastructure and access policy need to be selected before exposing an API publicly.

This repository has its own CellOmics Explorer deployment. The live application currently uses browser-local DNA analysis; the optional Python API is not deployed with it.

## License

[MIT](LICENSE). The migration retains the supplied project's license and attribution.
