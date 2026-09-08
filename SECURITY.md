# Security

Report vulnerabilities privately through the repository's Security → Report a vulnerability option if enabled. Otherwise contact the repository owner privately; do not post exploits with sensitive data in public issues.

Supported development line: 2.x. Security fixes require a reviewed pull request and a passing CI run.

Local file previews stay in the browser. The DNA workbench sends sequences to the FastAPI URL only when configured to use that service. The API has no authentication or durable storage and is intended for local development or a protected research deployment. Use an authenticated gateway, request-body limits, TLS, and rate limiting before exposing it to untrusted users.

Teaching modules run in a sandboxed iframe. Uploaded filenames and text previews are escaped. Text preview is capped at 5 MiB. Binary formats are recognized without parsing.
