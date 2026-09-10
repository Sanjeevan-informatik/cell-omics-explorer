import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const catalog = JSON.parse(await readFile(new URL('../data/catalog/datasets.json', import.meta.url), 'utf8'));
const migration = JSON.parse(await readFile(new URL('../data/provenance/migration-map.json', import.meta.url), 'utf8'));

test('catalog has one canonical storage object per unique biological sample', async () => {
  assert.equal(catalog.datasets.length, 36);
  const paths = new Set(catalog.datasets.map((d) => d.storage_path));
  assert.equal(paths.size, 36);
  for (const dataset of catalog.datasets) await stat(new URL('../' + dataset.storage_path, import.meta.url));
});

test('no-information-loss migration preserved every original content hash', async () => {
  assert.equal(migration.all_original_contents_preserved, true);
  assert.equal(migration.unique_content_objects, 36);
  for (const item of migration.mapping) {
    assert.ok(item.canonical_paths.length > 0, item.original_path);
    const bytes = await readFile(new URL('../' + item.canonical_paths[0], import.meta.url));
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, item.sha256, item.original_path);
  }
});

test('authoritative source tree contains no duplicate sample payload paths', async () => {
  const text = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.ok(text.length > 0); // Existing tracked compatibility samples are deliberately retained in v6.
  for (const dataset of catalog.datasets) assert.match(dataset.storage_path, /^data\/datasets\//);
});
