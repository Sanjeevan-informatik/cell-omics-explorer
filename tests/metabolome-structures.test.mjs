import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const model = JSON.parse(await readFile(new URL('../data/knowledge/metabolome-structures.json', import.meta.url), 'utf8'));
const explorer = await readFile(new URL('../components/metabolome-structure-explorer.tsx', import.meta.url), 'utf8');
const frame = await readFile(new URL('../components/explorer-frame.tsx', import.meta.url), 'utf8');

test('metabolome structure library spans major chemical families', () => {
  assert.ok(model.metabolites.length >= 12);
  const classes = new Set(model.metabolites.map((item) => item.class));
  for (const category of ['organic-acid','carbohydrate','amino-acid','nucleotide','fatty-acid','phospholipid','sterol','sphingolipid','glycan-building-block','biogenic-amine']) assert.ok(classes.has(category), category);
});

test('every teaching metabolite has identity, 2D bonds, and at least one 3D conformer', () => {
  for (const molecule of model.metabolites) {
    assert.ok(molecule.formula, molecule.id);
    assert.ok(molecule.canonical_smiles, molecule.id);
    assert.ok(molecule.structure_2d.atoms.length > 0, molecule.id);
    assert.ok(molecule.structure_2d.bonds.length > 0, molecule.id);
    assert.ok(molecule.structure_3d.atoms.length >= molecule.structure_2d.atoms.length, molecule.id);
    assert.ok(molecule.structure_3d.conformers.length >= 1, molecule.id);
    assert.ok(molecule.adducts.length >= 4, molecule.id);
  }
});

test('viewer exposes 1D, 2D, 3D, 4D, ion, spectrum and pathway levels', () => {
  for (const marker of ['1D identity','2D chemistry','3D conformer','4D ensemble','Ions & isotopes','MS/MS','Pathway']) assert.ok(explorer.includes(marker), marker);
  assert.match(explorer,/Show H atoms/);
  assert.match(explorer,/Rotation/);
  assert.match(explorer,/Zoom/);
});

test('metabolome route includes the new native structure explorer without removing legacy workspace handling', () => {
  assert.match(frame,/MetabolomeStructureExplorer/);
  assert.match(frame,/module==='metabolome'/);
  assert.match(frame,/explorer\/index\.html/);
});

test('scientific boundaries distinguish conformer ensemble from molecular dynamics', () => {
  const joined = model.scientific_boundaries.join(' ');
  assert.match(joined,/not a molecular-dynamics trajectory/i);
  assert.match(joined,/not experimentally solved/i);
});
