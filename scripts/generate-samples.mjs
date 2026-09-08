import { mkdir, writeFile } from 'node:fs/promises';
import { TEMPLATES } from '../lib/data-catalog.ts';
for (const directory of ['data/templates', 'public/data']) {
  await mkdir(directory, { recursive: true });
  for (const t of TEMPLATES) await writeFile(`${directory}/${t.filename}`, t.content);
  await writeFile(`${directory}/manifest.json`, JSON.stringify(TEMPLATES.map(({content,...t})=>({...t,synthetic:true})),null,2)+'\n');
}
console.log(`Generated ${TEMPLATES.length} synthetic templates and manifests.`);
