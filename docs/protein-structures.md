# Proteome & structures

Open `/explore/proteome` and load the 1–20 example, choose a protein FASTA from the shared data loader, or import a structure JSON bundle. The example is also available in the data loader and `data/templates/protein_structure.json`.

Ranges are 1-based inclusive, limited to 500 displayed residues. The 2D peptide backbone is a connectivity schematic with condensed side-chain information for all 20 standard amino acids. Hydrogens, stereochemistry, terminal groups, and full side-chain atom graphs are omitted. A display boundary does not create a new chemical terminus.

The 3D viewer renders supplied atom coordinates and explicit bonds only. Interaction overlays require both endpoints within the selected interval. Distance readouts use supplied units; they are not a classifier of hydrogen bonds or other contacts. Modification annotations do not alter the atom graph. Supply modified atoms and bonds to visualize their geometry. Fifteen common modification categories provide reference information; arbitrary named modifications/interactions with evidence are accepted.

4D playback requires increasing frame times and full coordinate arrays in the atoms-array order. Fixed topology only; chemical reactions, folding and molecular dynamics simulation are not implemented. Synthetic sample motion is not a physical trajectory. The sample is backbone-only and omits side-chain atoms, hydrogens and terminal oxygen.

## Upload contract

Download the example for the complete JSON schema. Maximum 5 MiB, 500 standard residues, 5,000 atoms and 100 frames. Map PDB author numbering, insertion codes and chains to the provided sequence positions before export; direct PDB/mmCIF decoding is not available. Use `unit: angstrom` for physical coordinates, or `schematic` for illustrations. Include reference and provenance. All annotation records need evidence; arbitrary labels are accepted without asserting their biological validity.

Sources: [Unimod](https://www.unimod.org/) for the modification reference; [RCSB PDB-101](https://pdb101.rcsb.org/) for structure education. This is a bounded scientific visualization tool, not an exhaustive chemical interaction engine.

## Range and inspection controls

Users can enter inclusive start/end positions, move sliders, show the full sequence, or advance to the next window. Automatic residue widths shrink to a configurable minimum; maximum mode, minimum mode and wrapping are available. The 3D/4D viewer supports drag rotation, Shift-drag pan, wheel/pinch zoom, double-click atom focus, fit-range reset and expanded inline display. Keyboard controls and an atom selector provide alternatives to pointer gestures. Atom inspection includes live frame coordinates, explicit bonds and nearest displayed atoms (proximity is not interaction evidence).

Teaching bundles cover the short backbone example, 100 residues with all 20 standard amino-acid types and all 15 reference modification annotations, and a sequence-only missing-structure example. All geometry and motion remain synthetic and backbone-only; annotations do not supply missing chemical atoms.

## Modification chemical panels

Load **modified peptide** to inspect phosphate at S16 and acetyl at K9. The 2D panel draws supplied component connectivity, highlighting modification atoms and the original-residue attachment separately. The same site selection colors the sequence strip, peptide diagram and 3D/4D atom halos. Focus and isolate controls help inspect the component. Coordinate playback carries atom identity forward; it does not model the formation/removal of a modification.

Bundles may add `atom_ids` and `attachment_atom_id` to each modification record. IDs must exist, the attachment must belong to the annotated residue, and a bond must connect the attachment to the component. Old annotation-only files remain supported with dashed residue markers and a missing-component explanation. Molecular validity is not inferred from passing structural validation.

The new example adds explicit heavy atoms for the two modified side chains. Other residues remain backbone-only. Stereochemistry, hydrogens, protonation and energies are not modeled. Chemical connectivity references: [ChEBI O-phospho-L-serine](https://www.ebi.ac.uk/chebi/CHEBI:15811) and [ChEBI N6-acetyl-L-lysine](https://www.ebi.ac.uk/chebi/CHEBI:17752). The 2D panel is a bond graph, not an angle-preserving chemical layout.
