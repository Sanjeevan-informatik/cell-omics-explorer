import raw from "@/data/knowledge/epigenome-structures.json";

export type DnaModification = {
  id: string;
  name: string;
  short: string;
  base: string;
  category: string;
  formula: string;
  deltaMass: number | null;
  group: string;
  smiles: string;
  roles: string[];
  enzymes: string[];
  assays: string[];
  color: string;
};

export type DnaModificationCall = { position: number; modification: string; span?: number };
export type HelixPoint = { position: number; strand: number; base: string; x: number; y: number; z: number; backboneX: number; backboneY: number };
export type EpigenomeKnowledge = typeof raw;

export const EPIGENOME_KNOWLEDGE = raw;
export const DNA_MODIFICATIONS = raw.modifications as DnaModification[];
export const DNA_MODIFICATION_BY_ID = new Map(DNA_MODIFICATIONS.map((item) => [item.id, item]));
