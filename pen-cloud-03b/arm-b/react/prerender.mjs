// Build step: write dist/<route>.html with the desktop variant pre-rendered into #root (for no-JS clients and curl).
// The client (src/main.jsx) re-renders with the ?bp= variant, so tablet/mobile are decided in the browser.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const ssr = join(here, 'dist-ssr');
const { render, ROUTES } = await import(pathToFileURL(join(ssr, 'entry-server.js')).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--app-html-->')) throw new Error('index.html template marker missing');
for (const route of ROUTES) {
  const page = template
    .replace('<!--app-html-->', () => render(route, 'desktop'))
    .replace(/<title>[^<]*<\/title>/, `<title>${route} (Arm B', React)</title>`);
  writeFileSync(join(dist, `${route}.html`), page);
}
rmSync(ssr, { recursive: true, force: true });
console.log(`prerendered ${ROUTES.length} routes (desktop variant) into dist/`);
