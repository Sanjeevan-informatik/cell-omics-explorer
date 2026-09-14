#!/usr/bin/env python3
"""Generate the teaching chemical-structure library used by the metabolome explorer.

This is a build/provenance helper, not a runtime dependency. It requires RDKit.
2D coordinates are RDKit depictions; 3D frames are ETKDGv3 conformers optimized
with UFF. They are teaching conformers, not experimentally solved structures or
molecular-dynamics trajectories.
"""
from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, Crippen, Descriptors, Lipinski, rdDepictor, rdMolDescriptors

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "knowledge" / "metabolome-structures.json"

COMPOUNDS = [
    {
        "id": "pyruvate",
        "name": "Pyruvate / pyruvic acid",
        "class": "organic-acid",
        "family": "Alpha-keto acid",
        "smiles": "CC(=O)C(=O)O",
        "pathways": ["Glycolysis", "Pyruvate metabolism", "TCA entry"],
        "description": "Central three-carbon metabolite connecting glycolysis to lactate production and mitochondrial oxidation.",
        "functional_groups": ["carboxylic acid", "ketone", "methyl"],
    },
    {
        "id": "lactate",
        "name": "L-Lactate / lactic acid",
        "class": "organic-acid",
        "family": "Hydroxy acid",
        "smiles": "C[C@@H](O)C(=O)O",
        "pathways": ["Glycolysis", "Lactate metabolism", "Cori cycle"],
        "description": "Chiral hydroxy acid produced from pyruvate and widely measured in energy-metabolism studies.",
        "functional_groups": ["carboxylic acid", "secondary alcohol", "methyl"],
    },
    {
        "id": "citrate",
        "name": "Citrate / citric acid",
        "class": "organic-acid",
        "family": "Tricarboxylic acid",
        "smiles": "OC(=O)CC(O)(CC(=O)O)C(=O)O",
        "pathways": ["TCA cycle", "Citrate shuttle", "Fatty-acid synthesis"],
        "description": "Six-carbon TCA-cycle metabolite and the candidate used by the original metabolomics evidence example.",
        "functional_groups": ["three carboxylic acids", "tertiary alcohol"],
    },
    {
        "id": "glucose",
        "name": "D-Glucose",
        "class": "carbohydrate",
        "family": "Hexose monosaccharide",
        "smiles": "OC[C@H]1O[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O",
        "pathways": ["Glycolysis", "Pentose phosphate pathway", "Glycogen metabolism"],
        "description": "Major cellular carbon and energy source; represented here in a cyclic stereochemical form.",
        "functional_groups": ["hemiacetal", "multiple hydroxyls", "ether ring"],
    },
    {
        "id": "glutamine",
        "name": "L-Glutamine",
        "class": "amino-acid",
        "family": "Polar amino acid",
        "smiles": "N[C@@H](CCC(N)=O)C(=O)O",
        "pathways": ["Glutaminolysis", "Nitrogen metabolism", "Nucleotide biosynthesis"],
        "description": "Amino acid that contributes carbon and nitrogen to biosynthesis and cancer-cell metabolism.",
        "functional_groups": ["amine", "carboxylic acid", "amide"],
    },
    {
        "id": "atp",
        "name": "ATP",
        "class": "nucleotide",
        "family": "Purine nucleotide triphosphate",
        "smiles": "NC1=NC=NC2=C1N=CN2[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O",
        "pathways": ["Energy metabolism", "Purine metabolism", "Kinase reactions"],
        "description": "Adenosine triphosphate, shown to demonstrate a large, charged/ionizable nucleotide-like metabolite.",
        "functional_groups": ["purine", "ribose", "triphosphate", "hydroxyls"],
    },
    {
        "id": "palmitate",
        "name": "Palmitate / palmitic acid",
        "class": "fatty-acid",
        "family": "Saturated fatty acid",
        "smiles": "CCCCCCCCCCCCCCCC(=O)O",
        "pathways": ["Fatty-acid metabolism", "Beta oxidation", "Lipid biosynthesis"],
        "description": "C16 saturated fatty acid and a simple example of a long-chain lipid metabolite.",
        "functional_groups": ["carboxylic acid", "saturated hydrocarbon chain"],
    },
    {
        "id": "oleate",
        "name": "Oleate / oleic acid",
        "class": "fatty-acid",
        "family": "Monounsaturated fatty acid",
        "smiles": "CCCCCCCC/C=C\\CCCCCCCC(=O)O",
        "pathways": ["Fatty-acid metabolism", "Membrane lipid biosynthesis", "Beta oxidation"],
        "description": "C18:1 monounsaturated fatty acid illustrating double-bond geometry in lipid structures.",
        "functional_groups": ["carboxylic acid", "cis alkene", "hydrocarbon chain"],
    },
    {
        "id": "popc",
        "name": "PC 16:0/18:1 (POPC-like)",
        "class": "phospholipid",
        "family": "Phosphatidylcholine",
        "smiles": "CCCCCCCCCCCCCCCC(=O)OCC(COP(=O)([O-])OCC[N+](C)(C)C)OC(=O)CCCCCCC/C=C\\CCCCCCCC",
        "pathways": ["Glycerophospholipid metabolism", "Membrane organization", "Lipid signaling"],
        "description": "Representative phosphatidylcholine with one saturated and one monounsaturated acyl chain.",
        "functional_groups": ["phosphocholine", "two ester bonds", "two acyl chains", "alkene"],
    },
    {
        "id": "cholesterol",
        "name": "Cholesterol",
        "class": "sterol",
        "family": "Steroid / sterol",
        "smiles": "C[C@H](CCCC(C)C)[C@H]1CC[C@@H]2[C@@]1(CC[C@H]3[C@H]2CC=C4[C@@]3(CC[C@@H](C4)O)C)C",
        "pathways": ["Sterol metabolism", "Membrane organization", "Steroid biosynthesis"],
        "description": "Rigid sterol structure illustrating fused rings, stereochemistry and hydrophobic molecular shape.",
        "functional_groups": ["four fused rings", "secondary alcohol", "alkene", "alkyl side chain"],
    },
    {
        "id": "sphingosine",
        "name": "Sphingosine",
        "class": "sphingolipid",
        "family": "Long-chain amino alcohol",
        "smiles": "CCCCCCCCCCCCC/C=C/[C@@H](O)[C@@H](N)CO",
        "pathways": ["Sphingolipid metabolism", "Ceramide biosynthesis", "Membrane signaling"],
        "description": "Long-chain sphingoid base used to illustrate amphipathic lipid backbones and stereochemistry.",
        "functional_groups": ["primary alcohol", "secondary alcohol", "amine", "trans alkene", "long alkyl chain"],
    },
    {
        "id": "n-acetylglucosamine",
        "name": "N-Acetyl-D-glucosamine",
        "class": "glycan-building-block",
        "family": "Amino sugar",
        "smiles": "CC(=O)N[C@@H]1[C@@H](O)O[C@H](CO)[C@@H](O)[C@H]1O",
        "pathways": ["Amino-sugar metabolism", "Glycosylation", "Hexosamine biosynthesis"],
        "description": "A glycan building block. Full glycans require explicit linkage/branch information beyond composition alone.",
        "functional_groups": ["acetamide", "hemiacetal", "multiple hydroxyls", "ether ring"],
    },
    {
        "id": "dopamine",
        "name": "Dopamine",
        "class": "biogenic-amine",
        "family": "Catecholamine",
        "smiles": "NCCc1ccc(O)c(O)c1",
        "pathways": ["Tyrosine metabolism", "Catecholamine biosynthesis", "Neurotransmission"],
        "description": "Small aromatic biogenic amine illustrating an aromatic ring, catechol hydroxyls and a primary amine.",
        "functional_groups": ["catechol", "primary amine", "aromatic ring"],
    },
]

PROTON = 1.007276466621
SODIUM = 22.989218
POTASSIUM = 38.963158
AMMONIUM = 18.033823


def bond_order(bond: Chem.Bond) -> float:
    if bond.GetIsAromatic():
        return 1.5
    return float(bond.GetBondTypeAsDouble())


def normalize_xy(coords: list[tuple[float, float]]) -> list[tuple[float, float]]:
    xs = [p[0] for p in coords]
    ys = [p[1] for p in coords]
    lo_x, hi_x = min(xs), max(xs)
    lo_y, hi_y = min(ys), max(ys)
    span_x = hi_x - lo_x or 1.0
    span_y = hi_y - lo_y or 1.0
    scale = min(78 / span_x, 70 / span_y)
    width = span_x * scale
    height = span_y * scale
    left = (100 - width) / 2
    top = (100 - height) / 2
    return [(left + (x - lo_x) * scale, 100 - (top + (y - lo_y) * scale)) for x, y in coords]


def element_counts(mol: Chem.Mol) -> dict[str, int]:
    formula_mol = Chem.AddHs(mol)
    return dict(sorted(Counter(atom.GetSymbol() for atom in formula_mol.GetAtoms()).items()))


def make_record(entry: dict) -> dict:
    mol = Chem.MolFromSmiles(entry["smiles"])
    if mol is None:
        raise ValueError(f"Could not parse {entry['id']}")
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True)

    # 2D heavy-atom depiction.
    mol2d = Chem.Mol(mol)
    rdDepictor.Compute2DCoords(mol2d)
    conf2d = mol2d.GetConformer()
    coords2d = normalize_xy([(conf2d.GetAtomPosition(i).x, conf2d.GetAtomPosition(i).y) for i in range(mol2d.GetNumAtoms())])
    atoms2d = []
    for atom, (x, y) in zip(mol2d.GetAtoms(), coords2d):
        atoms2d.append({
            "id": atom.GetIdx(),
            "element": atom.GetSymbol(),
            "x": round(x, 3),
            "y": round(y, 3),
            "charge": atom.GetFormalCharge(),
            "aromatic": atom.GetIsAromatic(),
            "chiral": str(atom.GetChiralTag()).replace("CHI_", "").lower(),
        })
    bonds2d = [{
        "a": b.GetBeginAtomIdx(),
        "b": b.GetEndAtomIdx(),
        "order": bond_order(b),
        "aromatic": b.GetIsAromatic(),
    } for b in mol2d.GetBonds()]

    # 3D conformer ensemble with explicit H atoms. This is a conformer ensemble,
    # not a time-resolved molecular-dynamics trajectory.
    mol3d = Chem.AddHs(Chem.Mol(mol))
    params = AllChem.ETKDGv3()
    params.randomSeed = 0xC0FFEE
    params.pruneRmsThresh = 0.2
    conf_ids = [int(x) for x in AllChem.EmbedMultipleConfs(mol3d, numConfs=4, params=params)]
    if not conf_ids:
        fallback = int(AllChem.EmbedMolecule(mol3d, randomSeed=0xC0FFEE, useRandomCoords=True, maxAttempts=1000))
        if fallback >= 0:
            conf_ids = [fallback]
    try:
        AllChem.UFFOptimizeMoleculeConfs(mol3d, maxIters=250)
    except Exception:
        pass

    atoms3d = [{
        "id": atom.GetIdx(),
        "element": atom.GetSymbol(),
        "charge": atom.GetFormalCharge(),
        "heavy": atom.GetAtomicNum() > 1,
        "parent_heavy_atom": next((n.GetIdx() for n in atom.GetNeighbors() if n.GetAtomicNum() > 1), None),
    } for atom in mol3d.GetAtoms()]
    bonds3d = [{
        "a": b.GetBeginAtomIdx(),
        "b": b.GetEndAtomIdx(),
        "order": bond_order(b),
    } for b in mol3d.GetBonds()]
    conformers = []
    available = {conf.GetId(): conf for conf in mol3d.GetConformers()}
    for conf_id in conf_ids[:4]:
        conf = available.get(conf_id)
        if conf is None:
            continue
        coords = []
        for i in range(mol3d.GetNumAtoms()):
            p = conf.GetAtomPosition(i)
            coords.append([round(p.x, 4), round(p.y, 4), round(p.z, 4)])
        conformers.append({"id": int(conf_id), "coordinates": coords})

    exact_mass = float(rdMolDescriptors.CalcExactMolWt(mol))
    carbons = sum(1 for atom in mol.GetAtoms() if atom.GetSymbol() == "C")
    r13 = 0.0107 / 0.9893
    p0 = 1.0
    p1 = carbons * r13
    p2 = (carbons * (carbons - 1) / 2) * r13 * r13 if carbons > 1 else 0.0
    scale = max(p0, p1, p2) or 1.0
    isotope = [
        {"offset": 0, "mz": round(exact_mass, 4), "relative": round(100 * p0 / scale, 2)},
        {"offset": 1, "mz": round(exact_mass + 1.003355, 4), "relative": round(100 * p1 / scale, 2)},
        {"offset": 2, "mz": round(exact_mass + 2.00671, 4), "relative": round(100 * p2 / scale, 2)},
    ]

    chiral = Chem.FindMolChiralCenters(mol, includeUnassigned=True, useLegacyImplementation=False)
    stereo = "achiral / no assigned tetrahedral center" if not chiral else f"{len(chiral)} tetrahedral stereocenter(s): " + ", ".join(f"atom {idx + 1} {tag}" for idx, tag in chiral)

    record = dict(entry)
    record.update({
        "canonical_smiles": Chem.MolToSmiles(mol, isomericSmiles=True),
        "formula": rdMolDescriptors.CalcMolFormula(mol),
        "monoisotopic_mass": round(exact_mass, 5),
        "average_molecular_weight": round(float(Descriptors.MolWt(mol)), 4),
        "formal_charge": int(Chem.GetFormalCharge(mol)),
        "stereochemistry": stereo,
        "ring_count": int(rdMolDescriptors.CalcNumRings(mol)),
        "hbond_donors": int(Lipinski.NumHDonors(mol)),
        "hbond_acceptors": int(Lipinski.NumHAcceptors(mol)),
        "tpsa": round(float(rdMolDescriptors.CalcTPSA(mol)), 2),
        "logp": round(float(Crippen.MolLogP(mol)), 2),
        "element_counts": element_counts(mol),
        "adducts": [
            {"label": "[M+H]+", "charge": 1, "mz": round(exact_mass + PROTON, 5)},
            {"label": "[M+Na]+", "charge": 1, "mz": round(exact_mass + SODIUM, 5)},
            {"label": "[M+K]+", "charge": 1, "mz": round(exact_mass + POTASSIUM, 5)},
            {"label": "[M+NH4]+", "charge": 1, "mz": round(exact_mass + AMMONIUM, 5)},
            {"label": "[M-H]-", "charge": -1, "mz": round(max(0.0, exact_mass - PROTON), 5)},
        ],
        "isotope_envelope": isotope,
        "structure_2d": {"atoms": atoms2d, "bonds": bonds2d},
        "structure_3d": {"atoms": atoms3d, "bonds": bonds3d, "conformers": conformers},
    })
    return record


def main() -> None:
    records = [make_record(entry) for entry in COMPOUNDS]
    payload = {
        "schema_version": "1.0.0",
        "title": "Cell Omics Explorer metabolome chemical-structure teaching library",
        "scope_note": "Representative structure families, not an exhaustive metabolome. The viewer schema is designed so arbitrary future compounds can be loaded from a database/data lake.",
        "scientific_boundaries": [
            "2D structures are generated from explicit SMILES connectivity.",
            "3D views are RDKit ETKDGv3/UFF teaching conformers, not experimentally solved coordinates.",
            "4D mode steps through conformer ensembles; it is not a molecular-dynamics trajectory unless real trajectory frames are supplied later.",
            "Adduct m/z values are neutral-mass teaching calculations and do not model every ionization state or in-source chemistry.",
            "The isotope envelope is an approximate 13C-only teaching envelope; production isotope prediction should use a full isotope model.",
            "Glycan composition does not uniquely define linkage, branching, anomer or stereochemistry; explicit glycan structures need linkage-resolved records.",
        ],
        "supported_representation_layers": [
            {"id": "1d", "label": "1D identity", "detail": "Name, class, formula, exact mass, SMILES, stereochemistry and physicochemical descriptors."},
            {"id": "2d", "label": "2D chemistry", "detail": "Atom/bond connectivity, bond order, hetero atoms, charges, rings and functional-group annotations."},
            {"id": "3d", "label": "3D conformer", "detail": "Rotatable projected conformer with atom inspection and optional hydrogen display."},
            {"id": "4d", "label": "4D ensemble", "detail": "Conformer-frame dimension; replace with real MD/trajectory coordinates when available."},
            {"id": "ions", "label": "Ions & isotopes", "detail": "Common adduct m/z values and an approximate isotope envelope."},
            {"id": "msms", "label": "MS/MS evidence", "detail": "Link structure hypotheses to mass-spectrum evidence and future fragment annotation."},
            {"id": "pathway", "label": "Pathway context", "detail": "Connect a chemical entity to reactions, pathways and cross-omics evidence."},
        ],
        "supported_structure_families": [
            "organic acids", "amino acids", "carbohydrates", "nucleotides/cofactors", "fatty acids", "phospholipids", "sphingolipids", "sterols/steroids", "glycan building blocks", "biogenic amines", "arbitrary future small molecules"
        ],
        "future_import_formats": [
            {"format": "SMILES/CSV/TSV", "purpose": "identity and connectivity"},
            {"format": "SDF/MOL", "purpose": "2D/3D atom and bond coordinates"},
            {"format": "MOL2", "purpose": "3D coordinates and atom typing"},
            {"format": "PDB/mmCIF", "purpose": "coordinate models for metabolites or complexes"},
            {"format": "XYZ", "purpose": "simple atomic coordinates"},
            {"format": "mzML/mzXML/MGF/MSP", "purpose": "mass-spectral evidence"},
            {"format": "Lipid shorthand", "purpose": "lipid class/acyl-chain identities"},
            {"format": "Glycan composition/linkage notation", "purpose": "glycan composition and explicit topology"},
        ],
        "metabolites": records,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"wrote {OUT} with {len(records)} metabolites")


if __name__ == "__main__":
    main()
