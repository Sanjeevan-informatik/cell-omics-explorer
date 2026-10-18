import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

test("parses aligned FASTA records", async () => {
  const { parseFasta } = await vite.ssrLoadModule("/lib/genome-analysis.ts");
  const records = parseFasta(">reference\nACGT\n>sample\nAGGT\n");
  assert.equal(records.length, 2);
  assert.equal(records[1].sequence, "AGGT");
});

test("rejects unaligned FASTA", async () => {
  const { parseFasta } = await vite.ssrLoadModule("/lib/genome-analysis.ts");
  assert.throws(() => parseFasta(">a\nACGT\n>b\nACG\n"), /same length/);
});

test("returns alignment, composition and variable-site results", async () => {
  const { analyzeLocally } = await vite.ssrLoadModule("/lib/genome-analysis.ts");
  const result = analyzeLocally(">reference\nACGTACGT\n>sample\nACGTGCGT\n");
  assert.deepEqual(result.variants.map((site) => site.position), [5]);
  assert.deepEqual(Object.keys(result).sort(), ["composition", "metrics", "records", "sequenceLength", "variants"]);
  assert.equal(result.composition[0].gcPercent, 50);
  assert.deepEqual(result.variants[0].counts, { A: 1, G: 1 });
});

test("restores earlier sequence sessions without their obsolete settings", async () => {
  const { readSequenceWorkspace, saveSequenceWorkspace, SEQUENCE_WORKSPACE_KEY } =
    await vite.ssrLoadModule("/lib/sequence-workspace.ts");
  const fasta = ">a\nACGT\n>b\nACGA\n";
  const values = new Map([[SEQUENCE_WORKSPACE_KEY, JSON.stringify({
    fasta, selectedPosition: 3, model: "legacy-setting",
  })]]);
  const previousWindow = globalThis.window;
  globalThis.window = { sessionStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } };
  try {
    const restored = readSequenceWorkspace();
    assert.deepEqual(restored, { fasta, selectedPosition: 3 });
    assert.equal(saveSequenceWorkspace(restored), true);
    assert.deepEqual(JSON.parse(values.get(SEQUENCE_WORKSPACE_KEY)), restored);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("defines complete heavy-atom graphs for the four DNA nucleobases", async () => {
  const { NUCLEOBASES } = await vite.ssrLoadModule("/components/nucleobase-viewer.tsx");
  assert.deepEqual(Object.keys(NUCLEOBASES), ["A", "C", "G", "T"]);
  assert.deepEqual(
    Object.fromEntries(Object.entries(NUCLEOBASES).map(([base, compound]) => [base, compound.formula])),
    { A: "C₅H₅N₅", C: "C₄H₅N₃O", G: "C₅H₅N₅O", T: "C₅H₆N₂O₂" },
  );
  for (const compound of Object.values(NUCLEOBASES)) {
    assert.ok(compound.atoms.length >= 8);
    assert.ok(compound.bonds.length >= compound.atoms.length);
    assert.ok(compound.bonds.every((bond) => bond.from < compound.atoms.length && bond.to < compound.atoms.length));
  }
});
