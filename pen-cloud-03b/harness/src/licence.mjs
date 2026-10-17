// Supplementary licence hygiene check. NEVER writes source lines: only counts, locations in Arm C
// (file + line number) and SHA-256 hashes of matching lines.
import fs from 'node:fs';
import path from 'node:path';
import { walkFiles, sha256 } from './util.mjs';

const MIN_LEN = 40;
// Strings are assembled at runtime so this harness never contains them literally.
const FORBIDDEN = [['relume', '-icons'], ['@relume', '_io'], ['d22po4pj', 'z3o32e']].map((p) => p.join(''));
const SKIP = ['node_modules', '.git'];
const MAX_BYTES = 64 * 1024 * 1024;

const isProbablyText = (buf) => !buf.subarray(0, 4096).includes(0);

export function lineHashesOfTree(root, { skip = SKIP } = {}) {
  const set = new Set();
  let files = 0, lines = 0;
  for (const f of walkFiles(root, { skipDirs: skip })) {
    const buf = fs.readFileSync(path.join(root, f));
    if (!isProbablyText(buf)) continue;
    files++;
    for (const l of buf.toString('utf8').split(/\r?\n/)) {
      const t = l.trim();
      if (t.length >= MIN_LEN) { set.add(sha256(t)); lines++; }
    }
  }
  return { set, files, lines };
}

// Pure import / re-export statements (single line, or the closing line of a multi-line import).
const IMPORT_LINE = /^(?:import\b[^;]*?\bfrom\s*['"][^'"]+['"]|import\s*['"][^'"]+['"]|export\b[^;]*?\bfrom\s*['"][^'"]+['"]|\}\s*from\s*['"][^'"]+['"])\s*;?$/;
export const isImportLine = (t) => IMPORT_LINE.test(t);

export function licenceCheck({ armCDir, relumeSrc }) {
  const ref = lineHashesOfTree(relumeSrc);
  const targets = [path.join(armCDir, 'app', 'src', 'generated'), path.join(armCDir, 'generator')];
  const matches = [];
  let scannedFiles = 0, scannedLines = 0;
  for (const root of targets) {
    if (!fs.existsSync(root)) continue;
    for (const f of walkFiles(root)) {
      const buf = fs.readFileSync(path.join(root, f));
      if (!isProbablyText(buf)) continue;
      scannedFiles++;
      buf.toString('utf8').split(/\r?\n/).forEach((l, i) => {
        const t = l.trim();
        if (t.length < MIN_LEN) return;
        scannedLines++;
        const h = sha256(t);
        if (ref.set.has(h)) matches.push({ importLine: isImportLine(t), file: path.relative(armCDir, path.join(root, f)).split(path.sep).join('/'), line: i + 1, sha256: h });
      });
    }
  }
  return {
    minLineLength: MIN_LEN, referenceFiles: ref.files, referenceLines: ref.lines,
    targets: targets.map((t) => ({ dir: t, exists: fs.existsSync(t) })), scannedFiles, scannedLines,
    matchCount: matches.length, uniqueMatchingHashes: [...new Set(matches.map((m) => m.sha256))].length, matches,
    matchCountExclImports: matches.filter((m) => !m.importLine).length,
    importLineMatchCount: matches.filter((m) => m.importLine).length,
    importLineMatches: matches.filter((m) => m.importLine),
    note: 'Supplementary, not proof. Only hashes and C-side file:line locations are recorded, never the lines.',
  };
}

export function forbiddenStringScan(root) {
  const hits = [];
  let scanned = 0;
  for (const f of walkFiles(root, { skipDirs: SKIP })) {
    const full = path.join(root, f);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (st.size > MAX_BYTES) { hits.push({ file: f, note: 'skipped: larger than limit' }); continue; }
    const buf = fs.readFileSync(full);
    scanned++;
    FORBIDDEN.forEach((s, i) => { if (buf.includes(s)) hits.push({ file: f, patternIndex: i }); });
  }
  return { root, patternsChecked: FORBIDDEN.length, filesScanned: scanned, hitCount: hits.filter((h) => h.patternIndex !== undefined).length, hits };
}
