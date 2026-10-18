export type SequenceRecord = { id: string; sequence: string };
export type Composition = {
  id: string;
  A: number;
  C: number;
  G: number;
  T: number;
  N: number;
  gcPercent: number;
};
export type VariantSite = {
  position: number;
  reference: string;
  alternates: string[];
  counts: Record<string, number>;
};
export type AnalysisResult = {
  records: SequenceRecord[];
  sequenceLength: number;
  composition: Composition[];
  variants: VariantSite[];
  metrics: {
    meanGcPercent: number;
    ambiguousBases: number;
    transitions: number;
    transversions: number;
    transitionTransversionRatio: number | null;
  };
};

const DNA = new Set(["A", "C", "G", "T", "N", "-", "?"]);
const TRANSITIONS = new Set(["AG", "GA", "CT", "TC"]);
const REFERENCE =
  "ATGCTAGCTAGGCTAACCGTATCGGATCCGATGCTAGCTTACGGTACCTGATCGTAGCTAGGTACCGATGCTAGCTAACGTTAGCGGATCCA";
const mutate = (sequence: string, positions: number[]) => {
  const replacement: Record<string, string> = { A: "G", G: "A", C: "T", T: "C" };
  const bases = [...sequence];
  positions.forEach((position) => { bases[position - 1] = replacement[bases[position - 1]]; });
  return bases.join("");
};

export const SAMPLE_FASTA = [
  ["SAMPLE_01_reference", REFERENCE],
  ["SAMPLE_02", mutate(REFERENCE, [8, 89])],
  ["SAMPLE_03", mutate(REFERENCE, [25, 58, 91])],
  ["SAMPLE_04", mutate(REFERENCE, [18, 45])],
  ["SAMPLE_05", mutate(REFERENCE, [12, 78, 89])],
].map(([id, sequence]) => `>${id}\n${sequence}`).join("\n");

export function parseFasta(input: string): SequenceRecord[] {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const records: SequenceRecord[] = [];
  let current: SequenceRecord | null = null;
  for (const line of lines) {
    if (line.startsWith(">")) {
      const id = line.slice(1).trim().split(/\s+/)[0];
      if (!id) throw new Error("Every FASTA header needs a sample name.");
      if (records.some((record) => record.id === id)) throw new Error(`Duplicate sample name: ${id}`);
      current = { id, sequence: "" };
      records.push(current);
    } else {
      if (!current) throw new Error("FASTA data must begin with a >sample header.");
      current.sequence += line.toUpperCase().replace(/\s/g, "");
    }
  }
  if (records.length < 2) throw new Error("Add at least two DNA sequences.");
  if (records.some((record) => !record.sequence)) throw new Error("Each sample must contain a DNA sequence.");
  const length = records[0].sequence.length;
  if (records.some((record) => record.sequence.length !== length)) {
    throw new Error("Sequences must be aligned and have the same length.");
  }
  if (records.some((record) => [...record.sequence].some((base) => !DNA.has(base)))) {
    throw new Error("Only A, C, G, T, N, ?, and alignment gaps (-) are supported.");
  }
  if (records.length > 50 || length > 20_000) {
    throw new Error("The browser demo supports up to 50 sequences × 20,000 bases.");
  }
  return records;
}

export function analyzeLocally(input: string): AnalysisResult {
  const records = parseFasta(input);
  const sequenceLength = records[0].sequence.length;
  const composition = records.map((record) => {
    const counts = { A: 0, C: 0, G: 0, T: 0, N: 0 };
    for (const base of record.sequence) {
      if (base in counts) counts[base as keyof typeof counts] += 1;
      else counts.N += 1;
    }
    const canonical = counts.A + counts.C + counts.G + counts.T;
    return { id: record.id, ...counts, gcPercent: canonical ? ((counts.G + counts.C) / canonical) * 100 : 0 };
  });
  const variants: VariantSite[] = [];
  let transitions = 0;
  let transversions = 0;
  const reference = records[0].sequence;
  for (let index = 0; index < sequenceLength; index += 1) {
    const counts: Record<string, number> = {};
    for (const record of records) counts[record.sequence[index]] = (counts[record.sequence[index]] ?? 0) + 1;
    const canonical = Object.keys(counts).filter((base) => "ACGT".includes(base));
    if (canonical.length > 1) {
      const alternates = canonical.filter((base) => base !== reference[index]);
      variants.push({ position: index + 1, reference: reference[index], alternates, counts });
      for (const alternate of alternates) {
        if (TRANSITIONS.has(`${reference[index]}${alternate}`)) transitions += counts[alternate];
        else transversions += counts[alternate];
      }
    }
  }
  const ambiguousBases = composition.reduce((sum, row) => sum + row.N, 0);
  const meanGcPercent = composition.reduce((sum, row) => sum + row.gcPercent, 0) / composition.length;
  return {
    records,
    sequenceLength,
    composition,
    variants,
    metrics: {
      meanGcPercent,
      ambiguousBases,
      transitions,
      transversions,
      transitionTransversionRatio: transversions ? transitions / transversions : null,
    },
  };
}
