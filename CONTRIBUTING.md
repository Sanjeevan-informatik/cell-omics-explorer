# Contributing

Create a branch and open a pull request. Use a minimal synthetic dataset to explain behavior. Keep analysis functions separate from presentation and add numerical or parser tests when behavior changes.

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. For Python, install `backend/requirements-dev.txt`, then run `cd backend`, `ruff check app tests`, and `pytest -q`.

Keep demo data clearly labeled. Document genome assembly, coordinate convention, units, missing-data behavior, and statistical assumptions for new analyses. Do not imply file recognition is full scientific parsing. Never commit patient data, credentials, dependency folders, or generated build output.

New omics workspaces should use React components and register their navigation in `lib/workspaces.ts`. The retained viewer under `public/explorer` is a compatibility boundary; migrate one module at a time with tests before removing it.
