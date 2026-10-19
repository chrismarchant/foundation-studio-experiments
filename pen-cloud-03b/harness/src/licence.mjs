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

// ---------------------------------------------------------------------------------------------------------------
// Criteria r3.1 (amendment under OD-47): classification of forbidden-string hits. Detection is unchanged (every hit
// is still found and listed); only the judgement under --criteria r3.1 uses the classification. The exemption is by
// field designation, never by string: no package name is allow-listed.
//   provenanceField   .json file; EVERY occurrence of the matched string lies inside the string value of a key named
//                     `provenance` or `screensProvenance` or ending in `Provenance` (any depth; found by walking the parsed JSON).
//   builderAssignment file under scripts/ with a .py/.ts/.mjs/.js extension; EVERY line containing the string is an
//                     assignment / dictionary entry whose key is `provenance`, `screensProvenance` or ends in `Provenance`
//                     and whose value is a single string literal.
//   other             everything else (markdown, source, generated files, lockfiles, manifests, mixed files).
// ---------------------------------------------------------------------------------------------------------------
export const CLASSIFICATION_RULE = 'r3.1';
export const isProvenanceKey = (k) => typeof k === 'string' && (k === 'provenance' || k === 'screensProvenance' || k.endsWith('Provenance'));
const countOcc = (hay, needle) => { let n = 0, i = 0; while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; } return n; };

// Walk parsed JSON; count occurrences inside string values held directly by a provenance-named key, and in everything else.
function walkJson(node, needle, state, ptr = '') {
  if (Array.isArray(node)) { node.forEach((v, i) => walkJson(v, needle, state, `${ptr}/${i}`)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const here = `${ptr}/${k}`;
      state.outside += countOcc(k, needle); // an occurrence in a key name is never inside a value
      if (typeof v === 'string') {
        const n = countOcc(v, needle);
        if (n) { if (isProvenanceKey(k)) { state.inside += n; state.fields.push(here); } else { state.outside += n; state.outsidePaths.push(here); } }
      } else walkJson(v, needle, state, here);
    }
    return;
  }
  if (typeof node === 'string') { const n = countOcc(node, needle); if (n) { state.outside += n; state.outsidePaths.push(ptr || '/'); } }
}

const KEY_RE = '(?:provenance|screensProvenance|[A-Za-z0-9_$]*Provenance)';
const STR_RE = '(?:[rRbBuUfF]{0,2}(?:\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*")|`[^`$\\\\]*`)';
// `'key': 'literal'`, `key: 'literal'`, `key = 'literal'`, `const key = '...'`, `obj.key = '...'`, `d['key'] = '...'`; optional trailing , or ; and comment.
const ASSIGN_RES = [
  new RegExp(`^\\s*(?:(?:const|let|var)\\s+)?(?:['"]${KEY_RE}['"]|${KEY_RE})\\s*[:=](?![=>])\\s*${STR_RE}\\s*[,;]?\\s*(?:#.*|//.*)?$`),
  new RegExp(`^\\s*(?:[A-Za-z_$][\\w$.]*)?\\[\\s*['"]${KEY_RE}['"]\\s*\\]\\s*=(?!=)\\s*${STR_RE}\\s*[,;]?\\s*(?:#.*|//.*)?$`),
  new RegExp(`^\\s*(?:[A-Za-z_$][\\w$]*\\.)+${KEY_RE}\\s*=(?!=)\\s*${STR_RE}\\s*[,;]?\\s*(?:#.*|//.*)?$`),
];
export const isProvenanceAssignmentLine = (line) => ASSIGN_RES.some((re) => re.test(line));
const BUILDER_EXT = new Set(['.py', '.ts', '.mjs', '.js']);

/** Classify one hit (file relative to the scan root, contents as a Buffer, needle = the matched string). */
export function classifyHitContent(file, buf, needle) {
  const ext = path.posix.extname(file).toLowerCase();
  const text = buf.toString('utf8');
  const total = countOcc(text, needle);
  if (ext === '.json') {
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return { classification: 'other', occurrences: total, reason: 'json file does not parse; cannot locate the occurrences by walking values' }; }
    const st = { inside: 0, outside: 0, fields: [], outsidePaths: [] };
    walkJson(parsed, needle, st);
    // Raw count must be fully accounted for by occurrences inside provenance string values (guards against escapes / duplicate keys).
    if (st.inside > 0 && st.outside === 0 && st.inside === total) return { classification: 'provenanceField', occurrences: total, fields: st.fields };
    return { classification: 'other', occurrences: total, occurrencesInProvenanceFields: st.inside, occurrencesElsewhere: total - st.inside, provenanceFields: st.fields, elsewhere: st.outsidePaths.slice(0, 20),
      reason: `json: ${total - st.inside} of ${total} occurrence(s) are not inside the string value of a provenance-named key` };
  }
  if (file.startsWith('scripts/') && BUILDER_EXT.has(ext)) {
    const ok = [], bad = [];
    text.split(/\r?\n/).forEach((l, i) => { if (l.includes(needle)) (isProvenanceAssignmentLine(l) ? ok : bad).push(i + 1); });
    if (ok.length && !bad.length) return { classification: 'builderAssignment', occurrences: total, lines: ok };
    return { classification: 'other', occurrences: total, provenanceAssignmentLines: ok, otherLines: bad.slice(0, 50), otherLineCount: bad.length,
      reason: `builder script: ${bad.length} line(s) containing the string are not a provenance-key assignment` };
  }
  return { classification: 'other', occurrences: total, reason: `not a provenance-designated file type (${ext || 'no extension'}${file.startsWith('scripts/') ? ', under scripts/' : ''})` };
}

/** Classify a hit by reading the file from disk (used by summarise when a stored hit has no classification). */
export function classifyHitOnDisk(root, file, patternIndex) {
  const needle = FORBIDDEN[patternIndex];
  if (needle === undefined) return { classification: 'other', reason: `unknown patternIndex ${patternIndex}` };
  let buf;
  try { buf = fs.readFileSync(path.join(root, file)); } catch { return { classification: 'other', reason: `file not readable at ${path.join(root, file)}; cannot classify (treated as other)` }; }
  return classifyHitContent(file, buf, needle);
}

// ---------------------------------------------------------------------------------------------------------------
// Informational `scope` of an `other` hit (never changes pass/fail): `frozenPriorRevision` when the file is a DSC JSON,
// DSC notes file or builder script of a DSC revision lower than the revision the run's arm-c manifest points at
// (manifest dsc.revision matched against the `revision` fields of inputs/dsc/fs.ds.relume-default.r<N>.json),
// `current` otherwise, including when the manifest revision cannot be matched.
// ---------------------------------------------------------------------------------------------------------------
const REVISIONED_FILES = [/^inputs\/dsc\/fs\.ds\.relume-default\.r(\d+)\.json$/, /^inputs\/dsc\/DSC-R(\d+)-NOTES\.md$/, /^scripts\/build-dsc-r(\d+)\.(?:py|ts|mjs|js)$/];
export const revisionNumberOfFile = (file) => { for (const re of REVISIONED_FILES) { const m = re.exec(file); if (m) return Number(m[1]); } return null; };

/** Revision number N (of fs.ds.relume-default.r<N>.json under <root>/inputs/dsc) whose `revision` equals manifestRevision, else null. */
export function manifestRevisionNumber(root, manifestRevision) {
  if (!manifestRevision) return null;
  const dir = path.join(root, 'inputs', 'dsc');
  let names; try { names = fs.readdirSync(dir); } catch { return null; }
  for (const n of names) {
    const m = /^fs\.ds\.relume-default\.r(\d+)\.json$/.exec(n);
    if (!m) continue;
    try { if (JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')).revision === manifestRevision) return Number(m[1]); } catch { /* unreadable DSC: ignore */ }
  }
  return null;
}
/** dsc.revision of <armC>/app/src/generated/generated-manifest.json, or null. */
export function readManifestRevision(armCDir) {
  try { return JSON.parse(fs.readFileSync(path.join(armCDir, 'app', 'src', 'generated', 'generated-manifest.json'), 'utf8')).dsc?.revision || null; } catch { return null; }
}
export function scopeOfFile(root, file, manifestRevision) {
  const n = revisionNumberOfFile(file), cur = manifestRevisionNumber(root, manifestRevision);
  return n !== null && cur !== null && n < cur ? 'frozenPriorRevision' : 'current';
}
/** Counts of hits by classification and, for `other`, by scope. */
export function countClassifications(hits) {
  const real = hits.filter((h) => h.patternIndex !== undefined);
  const by = (c) => real.filter((h) => h.classification === c).length;
  const others = real.filter((h) => h.classification !== 'provenanceField' && h.classification !== 'builderAssignment');
  return { provenanceField: by('provenanceField'), builderAssignment: by('builderAssignment'), other: others.length,
    otherByScope: { frozenPriorRevision: others.filter((h) => h.scope === 'frozenPriorRevision').length, current: others.filter((h) => h.scope !== 'frozenPriorRevision').length } };
}

export function forbiddenStringScan(root, { manifestRevision = null } = {}) {
  const hits = [];
  let scanned = 0;
  const scopeCache = new Map();
  for (const f of walkFiles(root, { skipDirs: SKIP })) {
    const full = path.join(root, f);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (st.size > MAX_BYTES) { hits.push({ file: f, note: 'skipped: larger than limit' }); continue; }
    const buf = fs.readFileSync(full);
    scanned++;
    FORBIDDEN.forEach((s, i) => {
      if (!buf.includes(s)) return;
      const c = classifyHitContent(f, buf, s);
      if (c.classification === 'other') { if (!scopeCache.has(f)) scopeCache.set(f, scopeOfFile(root, f, manifestRevision)); c.scope = scopeCache.get(f); }
      hits.push({ file: f, patternIndex: i, ...c });
    });
  }
  const real = hits.filter((h) => h.patternIndex !== undefined);
  return { root, patternsChecked: FORBIDDEN.length, filesScanned: scanned, hitCount: real.length,
    classificationRule: CLASSIFICATION_RULE, manifestRevision, classificationCounts: countClassifications(hits), hits };
}
