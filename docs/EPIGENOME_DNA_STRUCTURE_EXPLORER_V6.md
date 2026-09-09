# Cell Omics Explorer v6 — Epigenome & DNA Structures

This release adds a structure-rich epigenome workspace without removing v5 data or features.

## Linked representations

1. **Sequence** — nucleotide-by-nucleotide modification calls with clickable positions.
2. **2D chemistry** — parent-base ring plus chemical modification group, formula, mass shift and a structure representation/SMILES when suitable.
3. **3D DNA** — teaching B-DNA helix with modification positions mapped onto the sequence.
4. **4D states** — an explicitly conceptual chromatin-state/ensemble view; it is not molecular dynamics.
5. **Epigenomic tracks** — 5mC, 5hmC, ATAC, histone-mark signals and a Hi-C matrix.
6. **Modification registry** — searchable registry of covalent marks/lesions, enzymes/repair systems and assay examples.

## Modification coverage

The bundled registry includes representative members of the major classes needed for the UI architecture: 5mC, 5hmC, 5fC, 5caC, 6mA, 4mC, 8-oxoG, O6-meG, N7-meG, uracil, hypoxanthine, xanthine, abasic/AP sites, CPDs, 6-4 photoproducts, ethenoadenine, a bulky BPDE-dG adduct and an interstrand crosslink example.

The term “all DNA modifications” is treated as an **extensible schema**, not a claim that a finite demo file enumerates all chemical lesions known or possible. Future records can add new modifications, exact structures, measured coordinates, sequence calls, assay evidence and data-lake object references without changing the viewer component.

## Scientific boundaries

- Epigenetic marks and DNA damage/adducts are labeled as different categories.
- 2D drawings are teaching schematics unless an exact structure representation is present.
- 3D B-DNA uses idealized geometry rather than an experimentally solved structure.
- 4D is a state/ensemble teaching visualization, not an MD trajectory or time-resolved experiment.
- Existing methylation, accessibility and Hi-C files remain canonical under the v4/v5 data architecture.

## Integration corrections and sample access

The integrated workspace retains all existing samples and modules. The supplied 58 bp sequence has nine representative calls; incompatible calls were relocated to the nearest available matching parent site. Original source bytes and a position correction audit are stored in `data/provenance/epigenome-original` and `epigenome-import-audit.json`.

Supplied SMILES were not consistently representations of the listed modified free bases. They are preserved in provenance but withheld from exact-structure display. The chemistry view separates an existing parent-base drawing from the chemical-change annotation. Exact modified atom geometries remain unavailable.

Range controls use 1-based inclusive coordinates, shared across sequence, rotatable helix, conceptual states and overlapping track/contact bins. Playback stops on pause, view change and component unmount. Registry search includes roles, enzymes and assays. Absence of demo calls is distinguished from biological absence.

Download the complete model at `/data/knowledge/epigenome-structures.json`, plus FASTA and TSV exports at `/data/epigenome/`. No participant or tissue is assigned to these synthetic demonstrations. These files supplement the upload workspace; uploaded assay files remain available as imported tables and do not silently replace teaching geometry.

Sources: [PubChem 5-methylcytosine](https://pubchem.ncbi.nlm.nih.gov/compound/5-Methylcytosine) and [NEB EM-seq workflow](https://www.neb.com/en-gb/tools-and-resources/video-library/nebnext-enzymatic-methyl-seq-workflow). Standard bisulfite/EM-seq signal does not independently distinguish 5mC and 5hmC.
