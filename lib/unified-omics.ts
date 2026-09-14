import type { DataCategory } from './data-catalog';
import atlas from '../data/knowledge/unified-atlas.json';

export type OmicsLayer = {
  id: DataCategory;
  label: string;
  short: string;
  benchmark: string;
  description: string;
  coordinateLinked: boolean;
};

export const OMICS_LAYERS = atlas.omics_layers as OmicsLayer[];
export const BENCHMARK_MODELS = atlas.benchmark_models;
export const DEMO_LOCUS = atlas.demo_locus;
export const DEMO_TRACKS = atlas.demo_tracks;
export const SINGLE_CELL_POINTS = atlas.single_cell_points;
export const HIC_MATRIX = atlas.hic_matrix;
export const ONCOPRINT = atlas.oncoprint;
export const PROTEIN_SEQUENCE = atlas.protein_sequence;
export const PTM_SITES = new Map<number,string>(atlas.ptm_sites.map((site) => [site.residue, site.modification]));
export const SPECTRUM = atlas.spectrum as [number, number][];
export const WORKFLOW = atlas.workflow;
