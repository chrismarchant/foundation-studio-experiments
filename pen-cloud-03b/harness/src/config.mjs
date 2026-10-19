// Central configuration for the PEN-CLOUD-03-B acceptance harness.
// Everything the contract fixes (ports, routes, viewports, probe points) lives here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXP_DIR = path.resolve(HARNESS_DIR, '..');
export const INPUTS_DIR = path.join(EXP_DIR, 'inputs');
export const ARM_A_ROOT = '/home/user/pc03b-arm-a';

export const ROUTES = ['button', 'navbar', 'header80', 'layout620', 'testimonial37', 'cta25', 'page'];

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, bp: null },
  { name: 'tablet', width: 768, height: 1024, bp: 'tablet' },
  { name: 'mobile', width: 375, height: 812, bp: 'mobile' },
];

export const BROWSER_CONTEXT = {
  deviceScaleFactor: 1,
  locale: 'en-GB',
  timezoneId: 'UTC',
  colorScheme: 'light',
  reducedMotion: 'no-preference',
};

export const SWEEP_ROUTES = ['layout620', 'testimonial37', 'header80', 'page'];
export const SWEEP_HEIGHT = 900;
export const SWEEP_MIN = 375;
export const SWEEP_MAX = 1440;

/**
 * Responsive sweep widths (r3 rule): the 64-px series 375..1440 (1440 always included) united with every
 * `screens[].minWidth` and `breakpoints[].minWidth` of the DSC and each of those minus one, clipped to
 * [375, 1440], sorted, unique. A DSC without `screens` (r1/r2) contributes its breakpoints only.
 */
export function sweepWidths(dsc = loadDsc()) {
  const set = new Set();
  for (let x = SWEEP_MIN; x <= SWEEP_MAX; x += 64) set.add(x);
  set.add(SWEEP_MAX); // always include the desktop canvas
  const mins = [...(dsc.screens || []), ...(dsc.breakpoints || [])].map((s) => s && s.minWidth).filter((m) => Number.isFinite(m));
  for (const m of mins) for (const x of [m, m - 1]) if (x >= SWEEP_MIN && x <= SWEEP_MAX) set.add(x);
  return [...set].sort((a, b) => a - b);
}

export const PROBE_P = [0, 0.25, 0.5, 0.75, 1];
export const PROBE_WAIT_MS = 600;

// Properties governed by tokens (token-integrity measurement).
export const GOVERNED_EXACT = new Set([
  'color', 'background-color', 'font-size', 'gap', 'row-gap', 'column-gap', 'grid-gap',
  'border-radius', 'line-height', 'font-weight', 'font-family', 'padding',
]);

// Expected SAC roles per route. Keys: nav, h1, h2, h3, button, link.
// /button has no SAC section; two buttons is the obvious reading of the contract.
export const EXPECTED = {
  button: { button: 2 },
  navbar: { nav: 1, button: 1 },
  header80: { h1: 1, button: 2 },
  layout620: { h2: 1, h3: 3, button: 1, link: 1 },
  testimonial37: { h2: 1 },
  cta25: { h2: 1, button: 2 },
};
export const PAGE_SECTIONS = ['navbar', 'header80', 'layout620', 'testimonial37', 'cta25'];

export function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// DSC selection: `--dsc <path relative to ../inputs>`; default r3 when that file exists, else r2.
export const DSC_DEFAULT_CANDIDATES = ['dsc/fs.ds.relume-default.r3.json', 'dsc/fs.ds.relume-default.r2.json'];
export function defaultDscRel() {
  return DSC_DEFAULT_CANDIDATES.find((c) => fs.existsSync(path.join(INPUTS_DIR, c))) || DSC_DEFAULT_CANDIDATES[DSC_DEFAULT_CANDIDATES.length - 1];
}
let activeDscRel = null;
/** Select the DSC used by every later loadDsc() call (relative to ../inputs). Returns the path used. */
export function setDscRel(rel) {
  const r = rel || defaultDscRel();
  if (!fs.existsSync(path.join(INPUTS_DIR, r))) throw new Error(`--dsc ${r}: no such file under ${INPUTS_DIR}`);
  activeDscRel = r;
  return r;
}
export function getDscRel() { return activeDscRel || defaultDscRel(); }
export function loadDsc(rel = getDscRel()) { return loadJson(path.join(INPUTS_DIR, rel)); }
export function loadCopy() { return loadJson(path.join(INPUTS_DIR, 'copy.json')); }

/**
 * DSC breakpoint tiers (`breakpoints`, never `screens`) → bp name for an arbitrary width.
 * r1/r2: desktop >=1024; r3: desktop >=992 (tablet >=768, else mobile). Arm B's `?bp=` follows these tiers.
 */
export function bpForWidth(width, dsc) {
  const bps = [...dsc.breakpoints].sort((a, b) => b.minWidth - a.minWidth);
  const hit = bps.find((b) => width >= b.minWidth) || bps[bps.length - 1];
  return { lg: 'desktop', md: 'tablet', sm: 'mobile' }[hit.id] || hit.id;
}

/**
 * Arm table. `paths` can be overridden (dry-run fixtures).
 * serve: [cwd, ...argv]; build group = arms sharing one `pnpm build`.
 */
export function makeArms(o = {}) {
  const armA = o.armARoot || ARM_A_ROOT;
  const armB = o.armBDir || path.join(EXP_DIR, 'arm-b');
  const armC = o.armCDir || path.join(EXP_DIR, 'arm-c');
  const ports = o.ports || { A: 4301, B: 4302, Bp: 4303, C: 4304, Cssr: 4305 };
  return {
    A: { id: 'A', port: ports.A, group: 'A', usesBp: false, isC: false,
         serve: { cwd: path.join(armA, 'app'), cmd: ['pnpm', 'serve'] }, buildDirs: [path.join(armA, 'app')] },
    B: { id: 'B', port: ports.B, group: 'B', usesBp: true, isC: false,
         serve: { cwd: armB, cmd: ['pnpm', 'serve'] }, buildDirs: [armB] },
    Bp: { id: 'Bp', port: ports.Bp, group: 'B', usesBp: true, isC: false,
          serve: { cwd: armB, cmd: ['pnpm', 'serve:react'] }, buildDirs: [armB] },
    C: { id: 'C', port: ports.C, group: 'C', usesBp: false, isC: true,
         rootDir: armC, serve: { cwd: armC, cmd: ['pnpm', 'serve'] }, buildDirs: [path.join(armC, 'app'), armC] },
    Cssr: { id: 'Cssr', port: ports.Cssr, group: 'C', usesBp: false, isC: true,
            rootDir: armC, serve: { cwd: armC, cmd: ['pnpm', 'serve:ssr'] }, buildDirs: [path.join(armC, 'app'), armC] },
  };
}
export const ARM_ORDER = ['A', 'B', 'Bp', 'C', 'Cssr'];
