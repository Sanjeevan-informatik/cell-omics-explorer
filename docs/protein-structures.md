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
