# Metabolite, lipid and glycan structures

Open `/explore/metabolome` and load a teaching molecule or upload a molecule JSON bundle. Existing tables and legacy spectra demos remain below the native workbench. The shared data loader also accepts molecular JSON under the metabolome destination.

2D displays supplied layout coordinates, explicit bond orders, atom identities, formal charges when provided and functional-group membership. The 3D/4D atom renderer supports rotation, zoom, pan, inspection, nearest-atom distances and coordinate-frame playback. Atom ranges refer to file order, not polymer sequence. Functional-group and atom-range filters apply across views. Hidden bonds do not imply chemical cleavage.

Six teaching datasets include ethanol, glycerol, palmitic acid, glucose-ring connectivity, maltose connectivity and an unresolved-feature example. All geometry and motion are synthetic. Hydrogens are implicit, stereochemistry omitted, and protonation equilibria are not calculated. Maltose connectivity links the first C1 through oxygen to the second C4; no alpha stereochemistry is encoded. Formulas are supplied metadata, not computed structural validation. Teaching samples have checked heavy-atom compositions.

## JSON contract

Fields: id, name, category, formula, provenance, unit (`angstrom` or `schematic`), has3d, atoms, bonds, groups, interactions, frames and timeUnit. Each atom includes id, element, x2/y2 layout coordinates, x/y/z coordinates and optional integer charge. For a 2D-only file set has3d false and supply placeholder zero xyz coordinates; no 3D view will be offered. Bonds reference atom IDs with order 1, 2 or 3. Aromatic systems require explicit Kekulé bonds. Groups contain name and atom_ids. Interaction records contain a, b, type and evidence. Frame positions follow atom-array order with increasing time values. Maximum 5 MiB, 5,000 atoms, 100 frames.

The protein renderer is reused only for its coordinate projection and interaction controls; molecule labels replace protein terminology, and no biological protein identity is inferred. The bundle schema itself contains no protein sequence.

Direct SDF/MOL/PDB decoding, SMILES interpretation, conformer prediction, energy minimization and molecular dynamics simulation are not implemented. An abundance table, formula, lipid shorthand or glycan composition cannot supply a unique atom graph.

Sources: [ChEBI glucose](https://www.ebi.ac.uk/chebi/CHEBI:17234), [ChEBI maltose](https://www.ebi.ac.uk/chebi/CHEBI:17306), [ChEMBL palmitic acid](https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL82293).
