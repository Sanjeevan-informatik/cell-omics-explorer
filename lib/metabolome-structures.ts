import model from '../data/knowledge/metabolome-structures.json';

export type ChemicalViewMode = '1d' | '2d' | '3d' | '4d' | 'ions' | 'msms' | 'pathway';

export type ChemicalAtom2D = {
  id: number;
  element: string;
  x: number;
  y: number;
  charge: number;
  aromatic: boolean;
  chiral: string;
};

export type ChemicalBond = {
  a: number;
  b: number;
  order: number;
  aromatic?: boolean;
};

export type ChemicalAtom3D = {
  id: number;
  element: string;
  charge: number;
  heavy: boolean;
  parent_heavy_atom: number | null;
};

export type ChemicalConformer = {
  id: number;
  coordinates: [number, number, number][];
};

export type MetaboliteStructure = {
  id: string;
  name: string;
  class: string;
  family: string;
  smiles: string;
  canonical_smiles: string;
  formula: string;
  monoisotopic_mass: number;
  average_molecular_weight: number;
  formal_charge: number;
  stereochemistry: string;
  ring_count: number;
  hbond_donors: number;
  hbond_acceptors: number;
  tpsa: number;
  logp: number;
  element_counts: Record<string, number>;
  pathways: string[];
  description: string;
  functional_groups: string[];
  adducts: {label: string; charge: number; mz: number}[];
  isotope_envelope: {offset: number; mz: number; relative: number}[];
  structure_2d: {atoms: ChemicalAtom2D[]; bonds: ChemicalBond[]};
  structure_3d: {atoms: ChemicalAtom3D[]; bonds: ChemicalBond[]; conformers: ChemicalConformer[]};
};

export const METABOLOME_STRUCTURE_MODEL = model;
export const METABOLITE_STRUCTURES = model.metabolites as unknown as MetaboliteStructure[];
export const METABOLOME_REPRESENTATIONS = model.supported_representation_layers;
export const METABOLOME_STRUCTURE_FAMILIES = model.supported_structure_families;
export const METABOLOME_IMPORT_FORMATS = model.future_import_formats;
export const METABOLOME_SCIENTIFIC_BOUNDARIES = model.scientific_boundaries;
