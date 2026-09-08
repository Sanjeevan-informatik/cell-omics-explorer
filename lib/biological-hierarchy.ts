export type HierarchyNode = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  group: string;
  details: string[];
  structure2d: string[];
  structure3d: string[];
};

export const DNA_30 = "ATGGCTCGCCTGACCGTCTCCGACCAGCTG";
export const RNA_30 = "AUGGCUCGCCUGACCGUCUCCGACCAGCUG";
export const PROTEIN_30 = "MARLTVSDQLAGKPEVNTYRALGSTVDPKH";
export const TRANSLATED_10 = PROTEIN_30.slice(0, 10);

export const CODONS = DNA_30.match(/.{1,3}/g) ?? [];
export const RNA_CODONS = RNA_30.match(/.{1,3}/g) ?? [];
export const RESIDUES_10 = TRANSLATED_10.split("");
export const PROTEIN_30_RESIDUES = PROTEIN_30.split("");

export const HIERARCHY_GROUPS = [
  {
    id: "sequence",
    title: "Sequence-centric layers",
    subtitle: "Interconnected central-dogma data and direct sequence-derived evidence.",
    nodes: ["dna", "dna-features", "rna", "protein", "peptide-ms"],
  },
  {
    id: "small-molecule",
    title: "Small-molecule layers",
    subtitle: "Chemical biomolecules that are not arranged as a linear DNA → RNA → protein chain.",
    nodes: ["metabolite", "lipid", "glycan"],
  },
  {
    id: "regulation",
    title: "Regulation and genome context",
    subtitle: "How the genome is organized, regulated, and interpreted.",
    nodes: ["epigenome", "chromatin", "gene-regulation"],
  },
  {
    id: "cell-state",
    title: "Cell and tissue context",
    subtitle: "Cell state, spatial organization, and imaging-based measurements.",
    nodes: ["single-cell", "spatial", "imaging"],
  },
  {
    id: "systems",
    title: "Systems and evolution",
    subtitle: "Network, immune, and phylogenetic context.",
    nodes: ["pathways", "immunomics", "evolution"],
  },
] as const;

export const HIERARCHY_NODES: Record<string, HierarchyNode> = {
  dna: {
    id: "dna",
    label: "DNA",
    subtitle: "Sequence and nucleotides",
    description: "Base-by-base genetic information. DNA is directly linked to DNA features, transcription, and protein-coding logic.",
    group: "sequence",
    details: ["FASTA / FASTQ / BAM / VCF", "Nucleotides A, C, G, T", "Variants, haplotypes, and coding context"],
    structure2d: ["Nucleotide: phosphate + deoxyribose + base", "Base pairing: A–T and C–G", "Local 30-base coding sequence"],
    structure3d: ["Double helix", "Nucleosome / chromatin context", "3D local locus representation"],
  },
  "dna-features": {
    id: "dna-features",
    label: "DNA features",
    subtitle: "Genes, exons, promoters, variants",
    description: "Annotations that give DNA biological meaning: exons, introns, promoters, enhancers, SNPs, indels, and coding coordinates.",
    group: "sequence",
    details: ["Genes and transcripts", "Promoters and regulatory elements", "Variant interpretation"],
    structure2d: ["Gene model with exon blocks", "Variant map", "Codon and CDS annotation"],
    structure3d: ["Regulatory loop concept", "Chromatin neighborhood", "Genome browser context"],
  },
  rna: {
    id: "rna",
    label: "RNA",
    subtitle: "Transcripts and expression",
    description: "mRNA is transcribed from DNA and preserves the coding logic that maps codons to amino-acid residues.",
    group: "sequence",
    details: ["RNA-seq coverage", "Isoforms and splicing", "mRNA sequence and expression"],
    structure2d: ["Ribonucleotide chemistry", "Codon groups", "Base pairing and hairpin sketch"],
    structure3d: ["Folded RNA strand", "Hairpin / stem-loop", "RNA–protein complex concept"],
  },
  protein: {
    id: "protein",
    label: "Protein",
    subtitle: "Residues and function",
    description: "Protein residues are translated from RNA codons. Sequence, domain context, and structure determine function.",
    group: "sequence",
    details: ["Residues 1–30 context", "Domain and motif context", "Function and binding"],
    structure2d: ["Amino-acid general structure", "Peptide bond", "Linear residue context"],
    structure3d: ["Ribbon model", "Secondary structure", "Pocket and residue neighborhood"],
  },
  "peptide-ms": {
    id: "peptide-ms",
    label: "Peptide / MS",
    subtitle: "Peptide evidence and spectra",
    description: "Mass spectrometry maps peptides back to proteins and often to the exact sequence window that created them.",
    group: "sequence",
    details: ["MS1 precursor", "MS2 fragments", "Peptide-spectrum match and protein evidence"],
    structure2d: ["Peptide sequence", "Fragment ladder", "Peptide bond chemistry"],
    structure3d: ["Peptide conformer", "Mapped-on-protein context", "Evidence-linked residue highlighting"],
  },
  metabolite: {
    id: "metabolite",
    label: "Metabolite",
    subtitle: "Small molecules",
    description: "Metabolites are downstream cellular molecules measured by LC-MS, GC-MS, or NMR. They are chemically important but separate from sequence-centric layers.",
    group: "small-molecule",
    details: ["m/z, RT, intensity", "Formula and adduct", "Pathway context"],
    structure2d: ["Molecular graph", "Functional groups", "Ion/adduct form"],
    structure3d: ["3D conformer", "Enzyme-binding sketch", "Pathway node context"],
  },
  lipid: {
    id: "lipid",
    label: "Lipid",
    subtitle: "Membrane molecules",
    description: "Lipids form membranes and signaling molecules; they are distinct from the central-dogma chain and should be grouped separately.",
    group: "small-molecule",
    details: ["Lipid class", "Fatty-acyl composition", "Membrane organization"],
    structure2d: ["Head group and tails", "Class annotation", "Acyl-chain context"],
    structure3d: ["Lipid conformer", "Bilayer context", "Membrane-protein environment"],
  },
  glycan: {
    id: "glycan",
    label: "Glycan",
    subtitle: "Sugars and glycoconjugates",
    description: "Glycans are branched carbohydrate structures that modify proteins and lipids and are best separated from the sequence-centric view.",
    group: "small-molecule",
    details: ["Monosaccharide composition", "Linkages", "Glycoprotein / glycolipid context"],
    structure2d: ["SNFG symbol view", "Linkage map", "Branching pattern"],
    structure3d: ["Glycan conformation", "Surface display", "Glycosylation environment"],
  },
  epigenome: {
    id: "epigenome",
    label: "Epigenome",
    subtitle: "Methylation and chromatin marks",
    description: "Chemical marks added on DNA or histones that regulate accessibility and expression.",
    group: "regulation",
    details: ["DNA methylation", "Histone marks", "ATAC accessibility"],
    structure2d: ["CpG methylation", "Histone-tail annotation", "Peak-track representation"],
    structure3d: ["Nucleosome concept", "Open versus closed chromatin", "Local mark context"],
  },
  chromatin: {
    id: "chromatin",
    label: "Chromatin / Hi-C",
    subtitle: "3D genome organization",
    description: "3D folding and contacts organize DNA in the nucleus and connect distal features.",
    group: "regulation",
    details: ["Hi-C contacts", "TADs and loops", "3D neighborhood"],
    structure2d: ["Contact map", "Loop arc", "Linear locus"],
    structure3d: ["Folded chromatin", "Looping model", "TAD block concept"],
  },
  "gene-regulation": {
    id: "gene-regulation",
    label: "Gene regulation",
    subtitle: "TFs and regulatory networks",
    description: "The regulatory layer connects DNA features, chromatin, transcription, and downstream function.",
    group: "regulation",
    details: ["TF binding", "Enhancers", "Network logic"],
    structure2d: ["Regulatory graph", "Enhancer-promoter links", "Motif representation"],
    structure3d: ["Enhancer loop concept", "Promoter contact", "TF–DNA complex concept"],
  },
  "single-cell": {
    id: "single-cell",
    label: "Single cell",
    subtitle: "Cell states",
    description: "Single-cell profiles show heterogeneous cell types and states across DNA-informed expression programs.",
    group: "cell-state",
    details: ["Cell clusters", "UMAP / t-SNE", "Cell-state markers"],
    structure2d: ["Embedding plot", "Cell × feature matrix", "Marker list"],
    structure3d: ["3D embedding", "Lineage / trajectory", "Cluster context"],
  },
  spatial: {
    id: "spatial",
    label: "Spatial",
    subtitle: "Tissue localization",
    description: "Spatial omics connect molecular data to tissue coordinates.",
    group: "cell-state",
    details: ["Spots / cells in tissue", "Spatial expression", "Neighborhood relationships"],
    structure2d: ["Tissue map", "Spot grid", "Feature heat overlay"],
    structure3d: ["3D tissue block", "Cell localization", "Neighborhood context"],
  },
  imaging: {
    id: "imaging",
    label: "Imaging / cytometry",
    subtitle: "Morphology and phenotypes",
    description: "Imaging and cytometry give visual and phenotypic context that complements omics layers.",
    group: "cell-state",
    details: ["Microscopy", "Flow / mass cytometry", "Morphology and markers"],
    structure2d: ["Channel overlay", "Gating view", "Phenotype panel"],
    structure3d: ["3D cell shape", "Volume rendering", "Phenotype neighborhood"],
  },
  pathways: {
    id: "pathways",
    label: "Pathways",
    subtitle: "Interactions and networks",
    description: "Networks integrate DNA, RNA, protein, and metabolite effects into system-level behavior.",
    group: "systems",
    details: ["PPI", "Pathway topology", "Signal flow"],
    structure2d: ["Node-edge network", "Pathway module", "Interaction map"],
    structure3d: ["Spatial network concept", "Compartmentalized pathway", "Complex assembly"],
  },
  immunomics: {
    id: "immunomics",
    label: "Immunomics",
    subtitle: "Immune receptors",
    description: "TCR/BCR and HLA data connect sequence logic with immune recognition.",
    group: "systems",
    details: ["V(D)J usage", "CDR3 clonotypes", "Antigen recognition"],
    structure2d: ["CDR3 sequence", "Rearrangement map", "Clonotype table"],
    structure3d: ["Receptor model", "Receptor–HLA concept", "Binding loop context"],
  },
  evolution: {
    id: "evolution",
    label: "Cell evolution / phylogeny",
    subtitle: "Lineages and trees",
    description: "Evolutionary relationships unify variant patterns, sequence distance, and lineage progression.",
    group: "systems",
    details: ["Distance matrix", "Tree topology", "Clonal progression"],
    structure2d: ["Phylogenetic tree", "Clone diagram", "Mutation table"],
    structure3d: ["3D lineage landscape", "Tumor clone space", "Tree-in-space concept"],
  },
};
