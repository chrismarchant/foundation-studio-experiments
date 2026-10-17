import { readdirSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'inputs', 'fonts');

// Copies inputs/fonts/source-sans-3.css + the woff2 files (verbatim) into <dest>.
export function copyFonts(dest) {
  mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const f of readdirSync(FONTS)) {
    if (f === 'source-sans-3.css' || f.endsWith('.woff2')) {
      copyFileSync(join(FONTS, f), join(dest, f));
      n++;
    }
  }
  return n;
}
