# Architecture

The React application owns navigation and route selection. DNA workspaces use React directly and share `lib/sequence-workspace.ts` for the original browser-local alignment state. The server validates `/explore/[module]` against a single registry and returns a 404 for unknown names.

The preexisting vanilla-JavaScript explorer lives under `public/explorer/`. A sandboxed iframe retains its templates and charts while hiding duplicate navigation. It receives only a whitelisted module ID through the URL fragment. It has no same-origin permission, parent-storage access, or backend bridge. This migration is a modular integration, not a completed rewrite of every teaching view into React.

The preview parser is independent of the DOM and tested with Node. It rejects empty/binary inputs, validates basic FASTA/FASTQ/VCF structure, and avoids claiming validation for other formats. The UI checks the 5 MiB file limit before reading. Rendered filenames and preview text are escaped.

DNA analysis runs in TypeScript by default. The optional FastAPI endpoint implements the same model family and JSON result structure. It bounds the request field to two million characters and accepts at most 50 sequences × 20,000 sites. It provides no authentication or storage.

For future production data, implement specialist parsers behind explicit dataset contracts including sample IDs, assembly, coordinate convention, units, provenance, and missing values. Add module-specific analyses only after end-to-end data validation. Do not turn teaching datasets into purported user results.
