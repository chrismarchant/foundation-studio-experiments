// Per-arm browser measurements (dom-roles, geometry, responsive, scroll probe, tokens, a11y, screenshots).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  ROUTES, VIEWPORTS, BROWSER_CONTEXT, SWEEP_ROUTES, SWEEP_HEIGHT, sweepWidths, PROBE_P, PROBE_WAIT_MS,
  EXPECTED, PAGE_SECTIONS, loadCopy, loadDsc, bpForWidth,
} from './config.mjs';
import * as PS from './page-scripts.mjs';
import { ensureDir, writeJson, sleep, round, sha256 } from './util.mjs';
import { normaliseTokenValue, parseUngoverned, judgeGovernedR3, judgeGovernedLegacy } from './tokenrules.mjs';

export async function launchBrowser() {
  return chromium.launch({ headless: true });
}

export function urlFor(arm, route, width, dsc) {
  let q = '';
  if (arm.usesBp) {
    const vp = VIEWPORTS.find((v) => v.width === width);
    const bp = vp ? vp.bp : bpForWidth(width, dsc) === 'desktop' ? null : bpForWidth(width, dsc);
    if (bp) q = `?bp=${bp}`;
  }
  return `http://127.0.0.1:${arm.port}/${route}${q}`;
}

async function newCtx(browser, width, height, extra = {}) {
  return browser.newContext({ viewport: { width, height }, ...BROWSER_CONTEXT, ...extra });
}

/** Open a route, wait for subject + fonts, install helpers. */
async function openRoute(ctx, url, route, copy, { fast = false } = {}) {
  const page = await ctx.newPage();
  const meta = { url, status: null, externalRequests: [], consoleErrors: [], pageErrors: [], failedRequests: [] };
  const origin = new URL(url).origin;
  page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) meta.externalRequests.push(r.url().slice(0, 200)); });
  page.on('requestfailed', (r) => meta.failedRequests.push(r.url().slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') meta.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => meta.pageErrors.push(String(e).slice(0, 300)));
  let resp = null;
  try { resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 }); } catch (e) { meta.gotoError = String(e).slice(0, 300); }
  meta.status = resp ? resp.status() : null;
  try { await page.waitForSelector('[data-fs-subject]', { timeout: 8000 }); meta.subjectSelector = true; } catch { meta.subjectSelector = false; }
  if (!fast) { try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { meta.networkIdleTimeout = true; } }
  try { meta.fonts = await page.evaluate(PS.readFonts); } catch (e) { meta.fonts = { error: String(e).slice(0, 200), source_sans_3_loaded: false }; }
  await page.evaluate(PS.installHelpers, { copy, route });
  await sleep(fast ? 50 : 150);
  return { page, meta };
}

// ---------- semantic scoring ----------
export function roleCounts(roles) {
  const c = { nav: 0, h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, button: 0, link: 0 };
  for (const r of roles) {
    if (r.role === 'navigation') c.nav++;
    else if (r.role === 'heading' && r.level >= 1 && r.level <= 6) c['h' + r.level]++;
    else if (r.role === 'button') c.button++;
    else if (r.role === 'link') c.link++;
  }
  return c;
}
function scoreAgainst(expected, roles) {
  const actual = roleCounts(roles);
  let want = 0, have = 0;
  const missing = [];
  for (const [k, n] of Object.entries(expected)) {
    want += n;
    const got = Math.min(actual[k], n);
    have += got;
    if (got < n) missing.push({ role: k, expected: n, actual: actual[k] });
  }
  return { expected, actual, want, have, missing };
}
export function semanticScore(route, roles) {
  const out = {};
  const run = (rs) => {
    if (route !== 'page') return scoreAgainst(EXPECTED[route], rs);
    const per = {};
    let want = 0, have = 0;
    const missing = [];
    for (const key of PAGE_SECTIONS) {
      const s = scoreAgainst(EXPECTED[key], rs.filter((r) => r.section === key));
      per[key] = s; want += s.want; have += s.have;
      for (const m of s.missing) missing.push({ section: key, ...m });
    }
    const h1 = rs.filter((r) => r.role === 'heading' && r.level === 1).length;
    want += 1; have += h1 === 1 ? 1 : 0;
    if (h1 !== 1) missing.push({ role: 'h1', expected: 'exactly 1', actual: h1 });
    return { perSection: per, want, have, missing, h1Count: h1, expected: 'sum of per-section expectations + exactly one h1', actual: roleCounts(rs) };
  };
  if (route === 'button' && !EXPECTED.button) return null;
  const all = run(roles);
  const vis = run(roles.filter((r) => r.visible));
  out.score = all.want ? round(all.have / all.want, 4) : null;
  out.visibleScore = vis.want ? round(vis.have / vis.want, 4) : null;
  out.expectedCount = all.want; out.presentCount = all.have;
  out.missing = all.missing; out.expected = all.expected; out.actual = all.actual;
  if (route === 'page') { out.perSection = Object.fromEntries(Object.entries(all.perSection).map(([k, v]) => [k, { score: v.want ? round(v.have / v.want, 4) : null, missing: v.missing, actual: v.actual }])); out.h1Count = all.h1Count; }
  return out;
}

// ---------- pages: dom / geometry / tokens / fonts / screenshots / a11y ----------
export async function measurePages({ browser, arm, outDir, routes = ROUTES, log = () => {} }) {
  const copy = loadCopy();
  const dsc = loadDsc();
  const res = { dom: {}, geometry: {}, tokens: {}, a11y: {}, meta: {} };
  const armDir = ensureDir(path.join(outDir, arm.id));
  for (const vp of VIEWPORTS) {
    const ctx = await newCtx(browser, vp.width, vp.height);
    for (const route of routes) {
      const url = urlFor(arm, route, vp.width, dsc);
      log(`  ${arm.id} ${route} @${vp.width}`);
      const { page, meta } = await openRoute(ctx, url, route, copy);
      const set = (bucket, v) => { (res[bucket][route] ||= {})[vp.width] = v; };
      try {
        const { dom, geometry } = await page.evaluate(PS.collectDomAndGeometry);
        dom.semantic = semanticScore(route, dom.roles);
        dom.counts = roleCounts(dom.roles);
        set('dom', { url, ...dom });
        set('geometry', { url, ...geometry });
      } catch (e) { set('dom', { url, error: String(e).slice(0, 300) }); set('geometry', { url, error: String(e).slice(0, 300) }); }
      try {
        const t = await page.evaluate(PS.collectDecls);
        set('tokens', { url, ...t });
      } catch (e) { set('tokens', { url, error: String(e).slice(0, 300) }); }
      // screenshot (scroll top, animations disabled, caret hidden)
      try {
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(100);
        const file = path.join(armDir, `${route}-${vp.width}.png`);
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
        meta.screenshot = path.relative(outDir, file);
      } catch (e) { meta.screenshotError = String(e).slice(0, 300); }
      try { meta.docHeight = await page.evaluate(() => document.documentElement.scrollHeight); } catch {}
      // axe
      const a11y = {};
      try {
        const r = await new AxeBuilder({ page }).analyze();
        const by = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
        a11y.violations = r.violations.map((v) => {
          by[v.impact || 'unknown'] = (by[v.impact || 'unknown'] || 0) + 1;
          return { id: v.id, impact: v.impact, help: v.help, nodeCount: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) };
        });
        a11y.byImpact = by;
        a11y.violationCount = r.violations.length;
        a11y.passes = r.passes.length;
        a11y.incomplete = r.incomplete.length;
      } catch (e) { a11y.error = String(e).slice(0, 300); }
      // keyboard
      try {
        if (route === 'navbar' || route === 'cta25') a11y.tabSequence = await tabSequence(page);
        a11y.focusVisible = await focusFirstButton(page);
      } catch (e) { a11y.keyboardError = String(e).slice(0, 300); }
      set('a11y', a11y);
      set('meta', meta);
      await page.close();
    }
    await ctx.close();
  }
  return res;
}

// Reset the sequential-focus starting point to the top of the document.
async function resetFocusStart(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const b = document.body;
    const had = b.hasAttribute('tabindex');
    if (!had) b.setAttribute('tabindex', '-1');
    b.focus({ preventScroll: true });
    b.blur();
    if (!had) b.removeAttribute('tabindex');
    const sel = window.getSelection(); if (sel) sel.removeAllRanges();
  });
}

async function focusFirstButton(page) {
  await resetFocusStart(page);
  const has = await page.evaluate(PS.markFirstButton);
  if (!has) return { found: false };
  let reachedByTab = false;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-pc-first-button'));
    if (hit) { reachedByTab = true; break; }
  }
  if (!reachedByTab) await page.evaluate(() => document.querySelector('[data-pc-first-button]').focus());
  const s = await page.evaluate(PS.readFocusStyle);
  return { ...s, reachedByTab };
}

async function tabSequence(page) {
  await resetFocusStart(page);
  const seq = [];
  let first = null;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(PS.describeActive);
    const sig = JSON.stringify([d.tag, d.text, d.ariaLabel]);
    if (d.tag === 'body') { seq.push(d); break; }
    if (first && sig === first) break;
    if (!first) first = sig;
    seq.push(d);
  }
  return seq;
}

// ---------- responsive sweep ----------
export async function measureResponsive({ browser, arm, log = () => {} }) {
  const copy = loadCopy();
  const dsc = loadDsc();
  const out = {};
  for (const width of sweepWidths(dsc)) {
    const ctx = await newCtx(browser, width, SWEEP_HEIGHT);
    for (const route of SWEEP_ROUTES) {
      const url = urlFor(arm, route, width, dsc);
      const { page, meta } = await openRoute(ctx, url, route, copy, { fast: true });
      try {
        const s = await page.evaluate(PS.collectSweep);
        (out[route] ||= {})[width] = { url, ...s, fontsLoaded: !!(meta.fonts && meta.fonts.source_sans_3_loaded) };
      } catch (e) { (out[route] ||= {})[width] = { url, error: String(e).slice(0, 300) }; }
      await page.close();
    }
    await ctx.close();
    log(`  ${arm.id} sweep @${width}`);
  }
  return out;
}

// ---------- header80 scroll probe ----------
export async function measureScrollProbe({ browser, arm, log = () => {} }) {
  const copy = loadCopy();
  const dsc = loadDsc();
  const out = {};
  for (const vp of VIEWPORTS) {
    const url = urlFor(arm, 'header80', vp.width, dsc);
    const rec = { url, samples: [] };
    const ctx = await newCtx(browser, vp.width, vp.height);
    const { page } = await openRoute(ctx, url, 'header80', copy);
    try {
      for (const p of PROBE_P) {
        const info = await page.evaluate(PS.scrollToProbe, p);
        await sleep(PROBE_WAIT_MS);
        const r = await page.evaluate(PS.readProbe);
        rec.samples.push({ p, ...info, ...r });
      }
      const last = rec.samples[rec.samples.length - 1];
      rec.hasMotionElements = !!(last.left.found && last.right.found);
      rec.hasTransform = rec.samples.some((s) => (s.left.found && !s.left.none) || (s.right.found && !s.right.none));
      rec.stickyFound = rec.samples[0].stickyFound;
    } catch (e) { rec.error = String(e).slice(0, 300); }
    await ctx.close();
    // reduced motion in a fresh context
    const rctx = await newCtx(browser, vp.width, vp.height, { reducedMotion: 'reduce' });
    const rp = await openRoute(rctx, url, 'header80', copy);
    try {
      const info = await rp.page.evaluate(PS.scrollToProbe, 0.5);
      await sleep(PROBE_WAIT_MS);
      const r = await rp.page.evaluate(PS.readProbe);
      const idL = !r.left.found || r.left.identity === true;
      const idR = !r.right.found || r.right.identity === true;
      rec.reducedMotion = { p: 0.5, ...info, ...r, identity: idL && idR, motionElementsFound: r.left.found && r.right.found,
        mediaMatches: await rp.page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches) };
    } catch (e) { rec.reducedMotion = { error: String(e).slice(0, 300) }; }
    await rctx.close();
    out[vp.width] = rec;
    log(`  ${arm.id} scroll probe @${vp.width}`);
  }
  return out;
}

// ---------- aggregate token integrity ----------
// Value normalisation and the manifest-coverage rules live in tokenrules.mjs (shared with summarise.mjs).
export { normaliseTokenValue };
const squash = (s) => s.replace(/[-_.]/g, '').toLowerCase();

/** Read generated-manifest.json `ungoverned[]` (entries {file, property, value, reason, source}). */
export function loadUngovernedManifest(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const u = parseUngoverned(j);
    return { path: file, ...u, dscRevision: j.dsc?.revision ?? null, sha256: sha256(fs.readFileSync(file)) };
  } catch (e) { return { path: file, entries: null, error: String(e.message || e).slice(0, 200) }; }
}

/**
 * Token integrity over all pages. Raw classes come from the browser (`var`, `literal`, `otherVar`, `neutral`, ...)
 * and are not changed here, so r1/r2 numbers stay reproducible. On top of them two manifest accountings are made
 * for C/C-SSR:
 *   governed    : r3 rule (D-6) - zero lengths neutral, shorthand/longhand-aware coverage, `coverage` counts;
 *   governedR2  : the r2 rule (exact strict/loose, `0px` still a literal), kept so `--criteria r2` is unchanged.
 * `rawLiterals` is the complete union of literal declarations so a stored run can be re-judged by summarise.mjs.
 */
export function aggregateTokens({ arm, tokenPages, dsc, manifest = null }) {
  const entries = manifest && manifest.entries ? manifest.entries : null;
  const manifestInfo = entries ? { path: manifest.path, entries: manifest.count, reasons: manifest.reasons, dscRevision: manifest.dscRevision ?? null, sha256: manifest.sha256 ?? null } : null;
  const union = new Map();
  const perPage = {};
  const unreadable = new Set();
  let fsVars = {};
  for (const [route, byW] of Object.entries(tokenPages)) {
    for (const [w, t] of Object.entries(byW)) {
      if (t.error) { (perPage[route] ||= {})[w] = { error: t.error }; continue; }
      const c = { var: 0, literal: 0, otherVar: 0, neutral: 0, unknown: 0, mixed: 0, shorthandVar: 0, shorthandLiteral: 0 };
      for (const d of t.decls) {
        if (d.shorthand) { if (d.cls === 'var') c.shorthandVar++; else if (d.cls === 'literal') c.shorthandLiteral++; continue; }
        c[d.cls]++;
        if (d.cls === 'var' && d.mixed) c.mixed++;
        if (!union.has(d.key)) union.set(d.key, d);
      }
      c.boundShare = c.var + c.literal ? round(c.var / (c.var + c.literal), 4) : null;
      if (entries) {
        const lit = t.decls.filter((d) => !d.shorthand && d.cls === 'literal');
        const g3 = judgeGovernedR3({ literals: lit, varDecls: c.var, entries });
        const g2 = judgeGovernedLegacy({ literals: lit, varDecls: c.var, entries });
        c.zeroLengthNeutral = g3.zeroLengthNeutral;
        c.excludedByManifest = g3.excludedByManifest;
        c.governedLiteral = g3.uncoveredLiteralDecls;
        c.boundShareGoverned = g3.boundShareGoverned;
        c.coverage = g3.coverage;
        c.excludedByManifestR2 = g2.excludedByManifest;
        c.governedLiteralR2 = g2.uncoveredLiteralDecls;
        c.boundShareGovernedR2 = g2.boundShareGoverned;
      }
      c.decls = t.decls.length; c.inlineStyleElements = t.inlineStyleElements;
      (perPage[route] ||= {})[w] = c;
      t.unreadable.forEach((u) => unreadable.add(u));
      Object.assign(fsVars, t.fsVars || {});
    }
  }
  const tot = { var: 0, literal: 0, otherVar: 0, neutral: 0, unknown: 0, mixed: 0 };
  const rawLiterals = [];
  for (const d of union.values()) {
    if (d.shorthand) continue;
    tot[d.cls]++;
    if (d.cls === 'var' && d.mixed) tot.mixed++;
    if (d.cls === 'literal') rawLiterals.push({ selector: d.selector, prop: d.prop, value: d.value, sheet: d.sheet });
  }
  const agg = {
    varDecls: tot.var, literalDecls: tot.literal, otherVarDecls: tot.otherVar, neutralDecls: tot.neutral, unreadableValueDecls: tot.unknown, mixedVarDecls: tot.mixed,
    boundShare: tot.var + tot.literal ? round(tot.var / (tot.var + tot.literal), 4) : null,
    boundShareStrict: tot.var + tot.literal + tot.otherVar ? round(tot.var / (tot.var + tot.literal + tot.otherVar), 4) : null,
    uniqueDeclarations: union.size, literalSamples: rawLiterals.slice(0, 300), rawLiterals, unreadableSheets: [...unreadable],
  };
  if (entries) {
    agg.governed = judgeGovernedR3({ literals: rawLiterals, varDecls: tot.var, entries, manifestInfo });
    agg.governedR2 = judgeGovernedLegacy({ literals: rawLiterals, varDecls: tot.var, entries, manifestInfo });
  } else if (arm.isC) {
    agg.governed = { manifest: manifest ? { path: manifest.path, error: manifest.error } : null, unavailable: true };
  }
  const result = { arm: arm.id, arm_level: agg, perPage };
  if (entries) result.manifestEntries = entries;
  if (arm.isC) result.tokens = compareTokens(dsc, fsVars);
  return result;
}

export function compareTokens(dsc, fsVars) {
  const names = Object.keys(fsVars);
  const bySquash = new Map(names.map((n) => [squash(n.replace(/^--/, '')), n]));
  const mismatches = [];
  const missing = [];
  let ok = 0;
  const resolved = {};
  for (const t of dsc.tokens.entries) {
    const key = squash(t.id.replace(/^fs\.token\./, ''));
    const name = bySquash.get('fs' + key) || bySquash.get('fstoken' + key) || bySquash.get(squash(t.id));
    if (!name) { missing.push({ id: t.id, expected: String(t.value) }); continue; }
    resolved[t.id] = name;
    const actual = fsVars[name];
    if (normaliseTokenValue(actual) === normaliseTokenValue(t.value)) ok++;
    else mismatches.push({ id: t.id, varName: name, expected: String(t.value), actual });
  }
  const known = new Set(Object.values(resolved));
  return { tokenCount: dsc.tokens.entries.length, ok, mismatchCount: mismatches.length, missingCount: missing.length, mismatches, missing,
    definedFsVars: names.length, extraFsVars: names.filter((n) => !known.has(n)), resolvedNames: resolved };
}
