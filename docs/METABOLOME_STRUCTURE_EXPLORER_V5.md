# Metabolome & Molecular Structure Explorer — v5

## Goal

The `/explore/metabolome` workspace now treats metabolite structure as a first-class data model, parallel to the existing Proteome & Structures experience. It does not attempt to enumerate all of chemical space. Instead it implements a reusable structure schema that can accept arbitrary future compounds from a database or data lake.

## Representation ladder

1. **1D identity** — name, class, formula, canonical SMILES, exact mass, stereochemistry, element counts, HBD/HBA, TPSA and cLogP.
2. **2D chemistry** — explicit atom/bond connectivity, bond order, aromaticity, formal charge and functional-group context.
3. **3D conformer** — rotatable projected atomic coordinates with zoom and optional hydrogen display.
4. **4D ensemble** — a conformer-frame dimension with play/pause and frame selection. The bundled frames are not molecular-dynamics time points.
5. **Ions & isotopes** — common teaching adduct m/z values and an approximate isotope envelope.
6. **MS/MS evidence** — the original spectrum evidence is preserved and linked to structure hypotheses.
7. **Pathway context** — selected molecules connect to pathway annotations and the future cross-omics evidence spine.

## Bundled representative chemical classes

The teaching library covers organic acids, carbohydrates, amino acids, nucleotides, fatty acids, phospholipids, sterols, sphingolipids, glycan building blocks and biogenic amines. Examples include pyruvate, lactate, citrate, D-glucose, L-glutamine, ATP, palmitate, oleate, a POPC-like phosphatidylcholine, cholesterol, sphingosine, N-acetyl-D-glucosamine and dopamine.

## Data architecture

The new canonical knowledge object is:

`data/knowledge/metabolome-structures.json`

The UI reads it through:

`lib/metabolome-structures.ts`

The reusable React viewer is:

`components/metabolome-structure-explorer.tsx`

This keeps chemistry data out of the React component and makes later storage replacement straightforward:

`database/data lake -> structure repository/adapter -> MetaboliteStructure -> React viewer`

The schema already separates identity, atoms, bonds, 2D coordinates, 3D conformers, adducts, isotope peaks, pathways and provenance boundaries.

## Generation provenance

`scripts/generate-metabolome-structures.py` generates the bundled teaching structures with RDKit. 2D coordinates use RDKit depiction. 3D coordinates use ETKDGv3 conformer generation with UFF optimization when available.

These are teaching conformers, not experimental crystallographic/NMR coordinates. The 4D view is a conformer ensemble, not molecular-dynamics output. A future data-lake adapter can replace the generated frames with validated SDF/MOL/MOL2/PDB/mmCIF/XYZ coordinates or real trajectory frames.

## Future structure inputs

The catalog now recognizes specialist chemical/structure formats such as SDF, MOL, MOL2, XYZ, PDB/mmCIF, MGF and MSP and gives conversion/adapter guidance. Direct browser parsing for all of those formats is deliberately not claimed yet.

## No information loss

The v5 work is additive to v4. The 36 canonical biological sample payloads remain unchanged. The legacy metabolome iframe workspace remains accessible, while the native structure workbench is added above it. Existing spectrum, lipid, glycan and metabolite tables are retained.
