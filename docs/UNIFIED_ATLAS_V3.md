# Unified Omics Atlas v3

Version 3 is an additive integration layer. It does **not** replace the original CellOmics Explorer, the browser-local DNA workbench, the sequence map, the DNA → RNA → protein teaching hierarchy, any existing omics workspace, sample template, backend function, or test.

## Design model

The `/atlas` route combines proven interaction patterns from several omics software families without claiming API or code compatibility with them:

- **Galaxy:** explicit workflow stages, provenance thinking, and specialist-tool boundaries.
- **JBrowse / IGV:** a coordinate-first locus drives synchronized genomic tracks.
- **HiGlass:** a compact contact-matrix view represents 3D-genome evidence.
- **scverse / CELLxGENE:** observation/feature linking and cell-state exploration.
- **cBioPortal:** compact sample-by-feature alteration matrices for multi-omics evidence.
- **FragPipe:** peptide/protein/PTM processing concepts and proteomics provenance.
- **Mol\*:** sequence-to-structure navigation concepts. The included 3D/4D display is explicitly a teaching visualization, not an experimentally solved structure or molecular-dynamics simulation.
- **MetaboAnalyst:** spectrum/feature → candidate annotation → pathway flow.

## Shared selection model

The atlas keeps one visible biological selection:

`assembly + chromosome + start + end + feature/gene`

Coordinate-aware layers (genome, methylation/accessibility, Hi-C, transcriptome) can be interpreted against this locus. Non-coordinate layers (single-cell, protein, metabolite and systems views) are connected through feature/sample relationships instead of pretending that every datatype uses genomic coordinates.

## Data integrity rules

1. Imported datasets remain owned by the existing in-browser `DataSession`.
2. The atlas counts and links ready datasets; it does not silently transform or normalize them.
3. Synthetic demonstrations remain labeled synthetic/teaching data.
4. Missing modalities stay missing. The UI does not fabricate uploaded values.
5. Binary/specialist formats continue to require the conversion routes documented in `FORMAT_SUPPORT.md`.
6. The legacy teaching explorer under `public/explorer/` is preserved unchanged.

## New files

- `app/atlas/page.tsx` — route for the unified atlas.
- `components/unified-omics-atlas.tsx` — synchronized interactive dashboard.
- `lib/unified-omics.ts` — omics-layer registry and synthetic teaching fixtures.
- `tests/unified-omics.test.mjs` — invariant checks for model coverage.

## Future production extensions

The current v3 atlas is intentionally a browser teaching/integration layer, not a replacement for specialist scientific engines. A production implementation should add validated contracts and adapters for BAM/CRAM, BigWig, Cool/Mcool, AnnData/MuData, mzML/PSM tables, experimentally resolved structure files, and standardized feature identifiers. Every adapter should retain reference assembly, coordinate convention, sample IDs, units, provenance, missing values, and transformation history.
