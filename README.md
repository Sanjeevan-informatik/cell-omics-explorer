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

Open **http://localhost:3000**. The cell explorer opens immediately. Choose **DNA analysis** for an aligned FASTA dataset; the other workspaces explain molecular layers using synthetic examples.

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
| DNA analysis | Implemented | Validate aligned FASTA, QC, GC composition, variants, p-distance/JC69/K2P, UPGMA, JSON/Newick exports |
| Sequence map | Implemented | Linked position selection and base-by-base alignment navigation |
| DNA → RNA → protein | Teaching model | Linked codons and residues with conceptual molecular views |
| Upload data & samples | Implemented, bounded | Multi-file input, CSV/TSV tables, FASTA/FASTQ/VCF/BED validation, sample catalog and conversion guidance |
| Epigenome & Hi-C | Synthetic examples | Methylation table and contact-map illustration |
| Transcriptome | Synthetic examples | Expression and exon/isoform illustration |
| Single cell & spatial | Synthetic examples | Predetermined clusters and spatial positions, not computed UMAP |
| Proteome & structures | Synthetic examples | MS1/MS2, peptide matches, modifications, atom-coordinate concepts |
| Metabolites/lipids/glycans | Synthetic examples | LC-MS feature and chemistry concepts |
| Immunomics | Synthetic examples | Clonotype sequences and frequencies |
| Imaging & cytometry | Synthetic examples | Microscopy and event-marker concepts |
| Pathways/evolution/integration | Synthetic examples | Signaling, tumor clone relationships, and EGFR evidence |

Open **Upload data & samples** to select multiple local files, drag and drop a batch, or load any of **24 synthetic templates across 11 omics families**. Samples are served from `/data/` and maintained in `data/templates/`, with a manifest describing units and expected columns. Load all samples or only the selected category.

Ready tables appear in their selected omics workspace. Invalid files show correction guidance; binary files show specialist conversion routes. Missing data remains empty until a file or sample is selected. Teaching demos require an explicit action and remain separate from uploaded measurements. FASTA can be passed directly to DNA analysis.

Limits: 5 MiB per text file, 20 MiB of previews per session, 20 files per batch, 40 files total, and 10,000 rows for delimited tables. Table previews retain the first 200 rows and display/filter that subset. Files stay in browser memory and the upload list clears on refresh; opening FASTA analysis separately stores that alignment in tab session storage. There is no server upload store, remote path/URL importer, or universal binary parser. See [format support](docs/FORMAT_SUPPORT.md).

DNA analysis accepts 2–50 aligned sequences of up to 20,000 sites. Positions are 1-based alignment columns, not automatically mapped human reference coordinates. Pairwise noncanonical bases are excluded; null distances indicate saturation or no comparable bases. UPGMA assumes approximately clock-like evolution. The 30-base coding example translates to 10 amino acids within a longer protein context, not 30 amino acids. Conceptual structures are not experimentally resolved structures or folding predictions.

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
