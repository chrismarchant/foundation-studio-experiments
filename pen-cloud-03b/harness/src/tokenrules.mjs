// Pure token-integrity rules (no browser, no I/O): value normalisation, zero-length neutrality, and manifest
// coverage of literal declarations. Shared by the measurement path (measure.mjs) and by summarise.mjs, which
// uses it to re-judge a stored run.
//
//   r1/r2 accounting (legacy, kept for re-judging and for `--criteria r2`):
//     a literal is covered only by an exact manifest entry (file basename + property + normalised value = strict;
//     property + value where the stylesheet is not any manifest file = loose). `0px` counts as a literal.
//   r3 accounting (D-6 fix):
//     1. zero lengths (0, 0px, 0rem, 0em, 0%, -0px, ... and any multi-value whose every component is a zero
//        length) are neutral, not literals;
//     2. coverage is shorthand/longhand aware for the governed box properties (padding, gap, border-radius):
//        a declaration is covered when each non-zero component, mapped to its axis (padding-left/-right <->
//        padding-inline, padding-top/-bottom <-> padding-block, row-gap/column-gap <-> gap, border-*-radius <->
//        border-radius, and the padding / border-radius / gap shorthands), equals the value of a manifest entry on
//        the same axis. The strict (same file basename) / loose (sheet not identifiable) scope is kept.
import { round } from './util.mjs';

// ---------- value normalisation ----------
function normaliseHex(v) {
  const s = String(v).trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return '#' + m[1].split('').map((c) => c + c).join('');
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
  if (m) return m[2] && m[2] !== 'ff' ? '#' + m[1] + m[2] : '#' + m[1];
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/.exec(s);
  if (m && (m[4] === undefined || Number(m[4]) === 1)) return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  return null;
}
export function normaliseTokenValue(v) {
  const s = String(v).trim();
  const hex = normaliseHex(s);
  if (hex) return hex;
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/i.exec(s);
  if (m) {
    const n = Number(m[1]);
    const u = (m[2] || '').toLowerCase();
    if (u === 'rem') return `${round(n * 16, 4)}px`;
    if (u === '' && n === 0) return '0px';
    return `${round(n, 4)}${u}`;
  }
  return s.replace(/["']/g, '').replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').toLowerCase();
}

const stripImportant = (v) => String(v).replace(/\s*!important\s*$/i, '').trim();
const basename = (f) => String(f || '').split('?')[0].split('/').pop();

/** Split a CSS value on top-level whitespace (parentheses and quotes respected). */
export function splitComponents(value) {
  const out = [];
  let depth = 0, q = null, cur = '';
  for (const ch of String(value).trim()) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------- zero lengths ----------
const LEN_UNITS = 'px|rem|em|%|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|ch|ex|pt|pc|cm|mm|in|lh|rlh|cqw|cqh';
const ZERO_LENGTH = new RegExp(`^[+-]?(?:0+\\.?0*|0*\\.0+)(?:${LEN_UNITS})?$`, 'i');
/** One component: 0, 0px, 0rem, 0em, 0%, -0px, +0.0em, ... */
export function isZeroLengthComponent(c) { return ZERO_LENGTH.test(String(c).trim()); }
/** A value is a zero length when every (non-`/`) component is a zero length. */
export function isZeroLength(value) {
  const parts = splitComponents(stripImportant(value)).filter((p) => p !== '/');
  return parts.length > 0 && parts.every(isZeroLengthComponent);
}

// ---------- axis expansion of the governed box properties ----------
const box4 = (parts) => {
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  if (parts.length === 4) return parts;
  return null;
};
const pair = (parts) => (parts.length === 1 ? [parts[0], parts[0]] : parts.length === 2 ? parts : null);
const SIDE_PADDING = { 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl',
  'padding-inline-start': 'pl', 'padding-inline-end': 'pr', 'padding-block-start': 'pt', 'padding-block-end': 'pb' };
const CORNER_RADIUS = { 'border-top-left-radius': 'tl', 'border-top-right-radius': 'tr', 'border-bottom-right-radius': 'br', 'border-bottom-left-radius': 'bl',
  'border-start-start-radius': 'tl', 'border-start-end-radius': 'tr', 'border-end-end-radius': 'br', 'border-end-start-radius': 'bl' };
const GAP_AXIS = { 'row-gap': 'row', 'grid-row-gap': 'row', 'column-gap': 'col', 'grid-column-gap': 'col' };

/**
 * Expand a governed box declaration into per-axis atoms [{axis, raw, zero}] (physical axes, LTR: inline = left/right,
 * block = top/bottom). Returns null for properties outside the padding / gap / border-radius families, and for
 * values that cannot be split reliably (elliptical `a / b` radii, var() and other functions are not expanded).
 */
export function expandAxes(prop, value) {
  const p = String(prop).toLowerCase();
  const v = stripImportant(value);
  if (!v || /var\(|calc\(|min\(|max\(|clamp\(/i.test(v)) return null;
  const parts = splitComponents(v);
  const atom = (axis, raw) => ({ axis, raw, zero: isZeroLengthComponent(raw) });
  if (p === 'padding') { const b = box4(parts); return b && ['pt', 'pr', 'pb', 'pl'].map((a, i) => atom(a, b[i])); }
  if (p === 'padding-inline') { const b = pair(parts); return b && [atom('pl', b[0]), atom('pr', b[1])]; }
  if (p === 'padding-block') { const b = pair(parts); return b && [atom('pt', b[0]), atom('pb', b[1])]; }
  if (SIDE_PADDING[p]) return parts.length === 1 ? [atom(SIDE_PADDING[p], parts[0])] : null;
  if (p === 'gap' || p === 'grid-gap') { const b = pair(parts); return b && [atom('row', b[0]), atom('col', b[1])]; }
  if (GAP_AXIS[p]) return parts.length === 1 ? [atom(GAP_AXIS[p], parts[0])] : null;
  if (p === 'border-radius') { if (parts.includes('/')) return null; const b = box4(parts); return b && ['tl', 'tr', 'br', 'bl'].map((a, i) => atom(a, b[i])); }
  if (CORNER_RADIUS[p]) return [atom(CORNER_RADIUS[p], v)]; // one corner; the value may be an elliptical pair, kept whole
  return null;
}
const nvAtom = (a) => normaliseTokenValue(a.raw);

// ---------- manifest coverage ----------
/** Legacy (r1/r2) coverage: exact strict / loose only. */
export function makeCoverageLegacy(entries) {
  const nv = (v) => normaliseTokenValue(stripImportant(v));
  const files = new Set(entries.map((e) => basename(e.file)));
  const strict = new Set(entries.map((e) => `${basename(e.file)}|${String(e.property).toLowerCase()}|${nv(e.value)}`));
  const loose = new Set(entries.map((e) => `${String(e.property).toLowerCase()}|${nv(e.value)}`));
  return (d) => {
    const base = basename(d.sheet);
    if (strict.has(`${base}|${d.prop}|${nv(d.value)}`)) return 'strict';
    if (!files.has(base) && loose.has(`${d.prop}|${nv(d.value)}`)) return 'loose';
    return null;
  };
}

/**
 * r3 coverage. Returns a function d -> null | 'strict' | 'loose' | 'viaShorthand'.
 * `cover.scopeOf(d)` tells, for a 'viaShorthand' hit, whether it was found in the declaration's own file ('strict')
 * or among all manifest entries because the sheet is not identifiable ('loose').
 */
export function makeCoverage(entries) {
  const exact = makeCoverageLegacy(entries);
  const files = new Set(entries.map((e) => basename(e.file)));
  const byFile = new Map(); // basename -> Map(axis -> Set(normalised value))
  const all = new Map();
  const put = (m, axis, val) => { if (!m.has(axis)) m.set(axis, new Set()); m.get(axis).add(val); };
  for (const e of entries) {
    const atoms = expandAxes(e.property, e.value);
    if (!atoms) continue;
    const b = basename(e.file);
    if (!byFile.has(b)) byFile.set(b, new Map());
    for (const a of atoms) { if (a.zero) continue; put(byFile.get(b), a.axis, nvAtom(a)); put(all, a.axis, nvAtom(a)); }
  }
  const cover = (d) => {
    const hit = exact(d);
    if (hit) return hit;
    const atoms = expandAxes(d.prop, d.value);
    if (!atoms) return null;
    const need = atoms.filter((a) => !a.zero);
    if (!need.length) return null;
    const known = files.has(basename(d.sheet));
    const pool = known ? byFile.get(basename(d.sheet)) : all;
    if (!pool) return null;
    return need.every((a) => pool.get(a.axis)?.has(nvAtom(a))) ? 'viaShorthand' : null;
  };
  cover.scopeOf = (d) => (files.has(basename(d.sheet)) ? 'strict' : 'loose');
  return cover;
}

// ---------- judging a set of literal declarations ----------
const sample = (d) => ({ selector: d.selector, prop: d.prop, value: d.value, sheet: d.sheet });
const share = (v, l) => (v + l ? round(v / (v + l), 4) : null);

/**
 * Legacy (r1/r2) governed accounting of `literals` (declarations classified literal at measurement time).
 * Result shape is the r2 `arm_level.governed` block.
 */
export function judgeGovernedLegacy({ literals, varDecls, entries, manifestInfo = null, maxUncovered = 300 }) {
  const cover = makeCoverageLegacy(entries);
  let strict = 0, loose = 0, truncated = 0;
  const uncovered = [];
  for (const d of literals) {
    const how = cover(d);
    if (how === 'strict') strict++;
    else if (how === 'loose') loose++;
    else if (uncovered.length < maxUncovered) uncovered.push(sample(d));
    else truncated++;
  }
  const real = literals.length - strict - loose;
  return {
    rule: 'r2', manifest: manifestInfo,
    excludedByManifest: strict + loose, excludedStrict: strict, excludedLoose: loose,
    uncoveredLiteralDecls: real, uncoveredLiterals: uncovered, uncoveredTruncated: truncated || undefined,
    boundShareGoverned: share(varDecls, real),
  };
}

/**
 * r3 governed accounting. `literals` are the declarations classified literal at measurement time (a zero length such
 * as `padding: 0px` is still a literal there); this function moves zero lengths to neutral, then covers the rest.
 */
export function judgeGovernedR3({ literals, varDecls, entries, manifestInfo = null, maxUncovered = 300 }) {
  const cover = makeCoverage(entries);
  const cov = { strict: 0, loose: 0, viaShorthand: 0, uncovered: 0 };
  const viaScope = { strict: 0, loose: 0 };
  let zeroNeutral = 0, truncated = 0;
  const zeroSamples = [];
  const uncovered = [];
  for (const d of literals) {
    if (isZeroLength(d.value)) { zeroNeutral++; if (zeroSamples.length < 50) zeroSamples.push(sample(d)); continue; }
    const how = cover(d);
    if (how) { cov[how]++; if (how === 'viaShorthand') viaScope[cover.scopeOf(d)]++; }
    else { cov.uncovered++; if (uncovered.length < maxUncovered) uncovered.push(sample(d)); else truncated++; }
  }
  const excluded = cov.strict + cov.loose + cov.viaShorthand;
  return {
    rule: 'r3', manifest: manifestInfo,
    coverage: cov, viaShorthandScope: viaScope,
    zeroLengthNeutral: zeroNeutral, zeroLengthNeutralSamples: zeroSamples,
    excludedByManifest: excluded, excludedStrict: cov.strict, excludedLoose: cov.loose, excludedViaShorthand: cov.viaShorthand,
    uncoveredLiteralDecls: cov.uncovered, uncoveredLiterals: uncovered, uncoveredTruncated: truncated || undefined,
    literalDeclsAfterZeroRule: literals.length - zeroNeutral,
    boundShareGoverned: share(varDecls, cov.uncovered),
  };
}

/** Load generated-manifest.json `ungoverned[]` (entries {file, property, value, reason, source}). */
export function parseUngoverned(json) {
  const entries = Array.isArray(json?.ungoverned) ? json.ungoverned : [];
  return { entries, count: entries.length, reasons: [...new Set(entries.map((e) => e.reason))].slice(0, 20) };
}
