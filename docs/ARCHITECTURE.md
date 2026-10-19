# Architecture

The React application owns navigation and route selection. DNA workspaces use React directly and share `lib/sequence-workspace.ts` for the original browser-local alignment state. The server validates `/explore/[module]` against a single registry and returns a 404 for unknown names.

The preexisting vanilla-JavaScript explorer lives under `public/explorer/`. A sandboxed iframe retains its templates and charts while hiding duplicate navigation. It receives only a whitelisted module ID through the URL fragment. It has no same-origin permission, parent-storage access, or backend bridge. This migration is a modular integration, not a completed rewrite of every teaching view into React.

The preview parser is independent of the DOM and tested with Node. It rejects empty/binary inputs, validates basic FASTA/FASTQ/VCF structure, and avoids claiming validation for other formats. The UI checks the 5 MiB file limit before reading. Rendered filenames and preview text are escaped.

DNA analysis runs in TypeScript by default. The optional FastAPI endpoint implements the same alignment statistics and JSON result structure. It bounds the request field to two million characters and accepts at most 50 sequences × 20,000 sites. It provides no authentication or storage.

For future production data, implement specialist parsers behind explicit dataset contracts including sample IDs, assembly, coordinate convention, units, provenance, and missing values. Add module-specific analyses only after end-to-end data validation. Do not turn teaching datasets into purported user results.

## Native data intake

`DataSession` owns ephemeral dataset state above all React routes. `DataHub` handles batch input, limits, samples and category assignment. Pure `lib/data-import.ts` parsing separates validation from rendering; React escapes user-supplied values in the preview table. `lib/data-catalog.ts` defines the synthetic sample contract and specialist conversion routes. Run `node --experimental-strip-types scripts/generate-samples.mjs` after changing the catalog; tests check served samples match it.

The omics route first shows ready imported datasets or actionable missing/unsupported states. The original teaching iframe is opened only through an explicit demo action (except the cell-map home). Tables are not passed to the legacy chart engine; this avoids presenting synthetic charts as uploaded measurements.

Sequence workspace snapshots contain the FASTA input and selected position. Existing tab sessions retain those values when reopened; obsolete settings are ignored.

## Single-cell and sample contracts

`lib/single-cell.ts` validates `cell-omics.singlecell/v1` packages and reads gene-by-cell tables or 10x-style Matrix Market bundles. All internal matrices use cells × genes; CSR missing entries are defined zeros, while missing dense values are invalid. Metadata is joined by unique cell ID, never row position. `SingleCellWorkbench` renders only supplied coordinates and measurements, with descriptive group summaries and reopenable JSON export.

`backend/app/single_cell.py` reads a bounded subset of the H5AD format through h5py. The raw upload endpoint streams at most 32 MiB to a temporary directory, checks shape and link/storage restrictions before numeric reads, and deletes the directory on success or failure. Frontend validation runs again on the returned package. X scale is unknown until supplied by a source; the reader never labels it raw counts automatically.

`lib/sample-links.ts` builds an exact sample-ID registry from metadata tables and joins long-form sample/sample_id tables, recognized numeric gene/protein-by-sample matrices, and single-cell sample IDs. Duplicate metadata IDs block those joins. Synthetic and experimental records have separate namespaces. Missing fields and unmatched IDs remain visible; no cross-unit numerical combination is performed.

Public examples are static, separately labeled experimental data. The PBMC preparation script pins its source SHA256 and preserves supplied numeric values and embeddings. The TCGA source files/provenance are reused unchanged from the existing feature branch. Tests verify both derived file hashes and sample-link coverage. `DataSession.add` applies a shared 40-file / 20 MiB parsed-state limit to every import path.
