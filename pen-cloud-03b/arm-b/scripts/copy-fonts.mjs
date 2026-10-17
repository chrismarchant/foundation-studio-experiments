// Provision react/public/fonts from inputs/fonts (static/fonts is written by build-static.mjs).
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFonts } from './lib/fonts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
console.log(`react/public/fonts: ${copyFonts(join(ROOT, 'react', 'public', 'fonts'))} files`);
