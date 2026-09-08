export type DistanceModel = "p-distance" | "jc69" | "k2p";

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
export type TreeNode = {
  name?: string;
  height: number;
  children?: [TreeNode, TreeNode];
};
export type AnalysisResult = {
  records: SequenceRecord[];
  sequenceLength: number;
  composition: Composition[];
  variants: VariantSite[];
  matrix: { samples: string[]; values: Array<Array<number | null>> };
  metrics: {
    meanGcPercent: number;
    ambiguousBases: number;
    transitions: number;
    transversions: number;
    transitionTransversionRatio: number | null;
  };
  tree: { root: TreeNode; newick: string };
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

function correctedDistance(first: string, second: string, model: DistanceModel) {
  let comparable = 0;
  let differences = 0;
  let transitions = 0;
  let transversions = 0;
  for (let index = 0; index < first.length; index += 1) {
    const a = first[index];
    const b = second[index];
    if (!"ACGT".includes(a) || !"ACGT".includes(b)) continue;
    comparable += 1;
    if (a !== b) {
      differences += 1;
      if (TRANSITIONS.has(`${a}${b}`)) transitions += 1;
      else transversions += 1;
    }
  }
  if (!comparable) return null;
  const p = differences / comparable;
  if (model === "p-distance") return p;
  if (model === "jc69") {
    const term = 1 - (4 * p) / 3;
    return term > 0 ? -0.75 * Math.log(term) : null;
  }
  const transitionRate = transitions / comparable;
  const transversionRate = transversions / comparable;
  const firstTerm = 1 - 2 * transitionRate - transversionRate;
  const secondTerm = 1 - 2 * transversionRate;
  return firstTerm > 0 && secondTerm > 0
    ? -0.5 * Math.log(firstTerm) - 0.25 * Math.log(secondTerm)
    : null;
}

function buildTree(samples: string[], matrix: Array<Array<number | null>>) {
  type Cluster = { members: number[]; node: TreeNode; newick: string };
  let clusters: Cluster[] = samples.map((sample, index) => ({
    members: [index],
    node: { name: sample, height: 0 },
    newick: sample.replace(/[^A-Za-z0-9_.-]/g, "_"),
  }));
  const averageDistance = (a: Cluster, b: Cluster) => {
    const values = a.members.flatMap((left) =>
      b.members.map((right) => matrix[left][right]).filter((value): value is number => value !== null),
    );
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Infinity;
  };
  while (clusters.length > 1) {
    let best: [number, number, number] = [0, 1, averageDistance(clusters[0], clusters[1])];
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const distance = averageDistance(clusters[i], clusters[j]);
        if (distance < best[2]) best = [i, j, distance];
      }
    }
    const [i, j, distance] = best;
    const left = clusters[i];
    const right = clusters[j];
    const height = Number.isFinite(distance) ? distance / 2 : Math.max(left.node.height, right.node.height) + 0.01;
    const merged: Cluster = {
      members: [...left.members, ...right.members],
      node: { height, children: [left.node, right.node] },
      newick: `(${left.newick}:${Math.max(0, height - left.node.height).toFixed(5)},${right.newick}:${Math.max(0, height - right.node.height).toFixed(5)})`,
    };
    clusters = clusters.filter((_, index) => index !== i && index !== j);
    clusters.push(merged);
  }
  return { root: clusters[0].node, newick: `${clusters[0].newick};` };
}

export function analyzeLocally(input: string, model: DistanceModel): AnalysisResult {
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
  const values = records.map((first, row) => records.map((second, column) =>
    row === column ? 0 : correctedDistance(first.sequence, second.sequence, model),
  ));
  const ambiguousBases = composition.reduce((sum, row) => sum + row.N, 0);
  const meanGcPercent = composition.reduce((sum, row) => sum + row.gcPercent, 0) / composition.length;
  return {
    records,
    sequenceLength,
    composition,
    variants,
    matrix: { samples: records.map((record) => record.id), values },
    metrics: {
      meanGcPercent,
      ambiguousBases,
      transitions,
      transversions,
      transitionTransversionRatio: transversions ? transitions / transversions : null,
    },
    tree: buildTree(records.map((record) => record.id), values),
  };
}
