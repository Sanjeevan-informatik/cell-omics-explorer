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
  server: { middlewareMode: true },
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

test("returns variants, symmetric distances and Newick", async () => {
  const { analyzeLocally } = await vite.ssrLoadModule("/lib/genome-analysis.ts");
  const result = analyzeLocally(">reference\nACGTACGT\n>sample\nACGTGCGT\n", "jc69");
  assert.deepEqual(result.variants.map((site) => site.position), [5]);
  assert.equal(result.matrix.values[0][1], result.matrix.values[1][0]);
  assert.match(result.tree.newick, /;$/);
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
