// Arm B: assemble static/ from wrapped/ (document shell + fonts). No markup edits.
// Files per route: <route>.html (desktop), <route>.tablet.html, <route>.mobile.html.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFonts } from './lib/fonts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'static');
const ROUTES = ['button', 'navbar', 'header80', 'layout620', 'testimonial37', 'cta25', 'page'];
const BPS = [['desktop', ''], ['tablet', '.tablet'], ['mobile', '.mobile']];
const prelude = readFileSync(join(ROOT, 'wrapped', 'prelude.css'), 'utf8');

rmSync(OUT, { recursive: true, force: true });
copyFonts(join(OUT, 'fonts'));

let n = 0;
for (const route of ROUTES) {
  for (const [bp, suffix] of BPS) {
    const body = readFileSync(join(ROOT, 'wrapped', bp, `${route}.html`), 'utf8');
    const css = readFileSync(join(ROOT, 'wrapped', bp, `${route}.css`), 'utf8');
    const doc = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${route} (Arm B, ${bp})</title>
<link rel="stylesheet" href="/fonts/source-sans-3.css">
<style>
${prelude}</style>
<style data-source="penpot-generateStyle">
${css}</style>
</head>
<body>
${body}</body>
</html>
`;
    writeFileSync(join(OUT, `${route}${suffix}.html`), doc);
    n++;
  }
}
console.log(`static/: ${n} documents`);
