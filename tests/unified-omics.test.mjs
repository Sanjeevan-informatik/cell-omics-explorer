import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const model = JSON.parse(await readFile(new URL('../data/knowledge/unified-atlas.json', import.meta.url), 'utf8'));
const atlas = await readFile(new URL('../components/unified-omics-atlas.tsx', import.meta.url), 'utf8');

test('v3 model preserves all original omics categories in the unified registry', () => {
  const ids = new Set(model.omics_layers.map((layer) => layer.id));
  for (const id of ['genome','epigenome','transcriptome','singlecell','proteome','metabolome','immunomics','imaging','pathways','evolution','multiomics']) assert.ok(ids.has(id), id);
});

test('benchmark design model includes all eight reference software families', () => {
  const names = model.benchmark_models.map((entry) => entry.name).join(' | ');
  for (const name of ['Galaxy','scverse / CELLxGENE','cBioPortal','JBrowse / IGV','HiGlass','Mol*','FragPipe','MetaboAnalyst']) assert.ok(names.includes(name), name);
});

test('atlas exposes synchronized genome, cell, multi-omics, structure, metabolome and workflow views', () => {
  for (const marker of ['Genome browser + linked molecular tracks','Hi-C contact map','Single-cell state explorer','Multi-omics alteration matrix','Proteome & molecular structure explorer','Metabolomics evidence explorer','Omics workflow studio','No-information-loss migration']) assert.ok(atlas.includes(marker), marker);
});
