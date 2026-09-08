# GitHub administration

## Repository files included

CI checks TypeScript, scientific/parser tests, the frontend build, and Python tests/lint. CodeQL scans JavaScript/TypeScript and Python. Dependabot proposes dependency updates. Issue forms, a PR template, CODEOWNERS, release categories, and a Codespaces configuration support collaboration.

Pushing a `v*` tag runs CI and then creates a release with a source ZIP and generated notes. Only tag a reviewed commit; no release is created merely by merging code. Frontend build artifacts expire after seven days.

## Settings requiring repository administration

After CI succeeds, configure a main-branch ruleset requiring pull requests and the `frontend` and `backend` status checks. Choose review requirements appropriate to the number of maintainers; CODEOWNERS alone does not enforce review. Enable private vulnerability reporting and dependency alerts as desired. Enable Discussions if community support is needed. A GitHub Project can track roadmap issues; it is not created by a repository file.

These settings have not been changed automatically. The connector's repository-file operations do not expose all administration settings. No Pages site, container package, release tag, or public API deployment is created by this migration.
