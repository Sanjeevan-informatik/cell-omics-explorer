import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});
const {TEMPLATES}=await vite.ssrLoadModule('/lib/data-catalog.ts');
for (const directory of ['data/templates', 'public/data']) {
  await mkdir(directory, { recursive: true });
  for (const t of TEMPLATES) await writeFile(`${directory}/${t.filename}`, t.content);
  await writeFile(`${directory}/manifest.json`, JSON.stringify(TEMPLATES.map(({content,...t})=>({...t,synthetic:true})),null,2)+'\n');
}
console.log(`Generated ${TEMPLATES.length} synthetic templates and manifests.`);

await vite.close();
