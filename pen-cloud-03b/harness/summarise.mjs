#!/usr/bin/env node
// Reads a harness run directory and emits summary.json + summary.md (PASS/FAIL against the PEN-CLOUD-03-B thresholds).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { judgeGovernedR3, parseUngoverned } from './src/tokenrules.mjs';
import { classifyHitOnDisk, scopeOfFile, countClassifications } from './src/licence.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARM_ORDER = ['A', 'B', 'Bp', 'C', 'Cssr'];
const ROUTES = ['button', 'navbar', 'header80', 'layout620', 'testimonial37', 'cta25', 'page'];
const VPS = [1440, 768, 375];
const SWEEP_ROUTES = ['layout620', 'testimonial37', 'header80', 'page'];

// r2 overrides (acceptance-specification change recorded after run r1); r1 keeps the original wording above.
const R2_OVERRIDES = {
  semantic: 'score = 100% of SAC-expected roles present at every viewport (role tree vs A is informational: the control has its own defects)',
  responsive: 'column counts and padding-top of the nearest <section> (or data-fs-id section root) containing the route heading equal to A at every sweep width (375..1440, 64px steps) and no horizontal overflow',
  tokenIntegrity: 'C only: boundShare over DSC-governed declarations = 100% (literals listed in generated-manifest.json ungoverned[] are excluded and counted; raw share is informational) and 0 DSC token mismatches/missing',
  determinism: 'C only: pnpm generate:verify exit 0; every FROZEN.md entry (paths relative to the arm-c root: app/src/generated/**, generator/**) found on disk with an equal SHA-256; (bundle reproducibility reported separately)',
  licence: 'C only: 0 matching lines >= 40 chars against Arm A reference source excluding pure import/export-from lines (reported separately); 0 forbidden-string hits (supplementary, not proof)',
};
// r3 = r2 + D-6 (token accounting) + D-7 (frozen-hash / verify-script selection); sweep widths now include the DSC boundaries.
// r3.1 (amendment under OD-47) = r3 except the forbidden-string row: hits are classified by field designation, not by string.
const R31_OVERRIDES = {
  licence: 'C only: 0 matching lines >= 40 chars against Arm A reference source (supplementary, not proof); forbidden strings (all 3 patterns, every hit still detected and listed): each hit is classified and the row passes only when every hit is provenanceField (.json file, every occurrence inside the string value of a key named provenance / screensProvenance / *Provenance, found by walking the parsed JSON) or builderAssignment (scripts/*.py|ts|mjs|js, every line containing the string is a provenance-key assignment or dictionary entry); any other hit (markdown notes, source, generated files, lockfiles, package manifests, mixed files) fails it',
};
const R3_OVERRIDES = {
  responsive: 'column counts and padding-top of the nearest <section> (or data-fs-id section root) containing the route heading equal to A at every sweep width (the 64px series 375..1440 plus every DSC screens[]/breakpoints[] minWidth and minWidth-1 inside 375..1440) and no horizontal overflow',
  tokenIntegrity: 'C only: boundShare over DSC-governed declarations = 100% and 0 DSC token mismatches/missing. D-6 accounting: zero lengths (0, 0px, 0rem, 0em, 0%, -0px, all-zero multi-values) are neutral; a literal is excluded when generated-manifest.json ungoverned[] covers it (strict: same file basename; loose: stylesheet not identifiable; viaShorthand: each non-zero component covered on its axis, padding-left/right <-> padding-inline, padding-top/bottom <-> padding-block, row/column-gap <-> gap, border-*-radius <-> border-radius, and the shorthands); raw share is informational',
  determinism: 'C only: the FROZEN*.md whose "DSC revision:" equals generated-manifest.json dsc.revision and the generate:verify* script whose --dsc file has that revision are selected and recorded (D-7); that script exits 0; every entry of the selected FROZEN file (paths relative to the arm-c root) found on disk with an equal SHA-256; (bundle reproducibility reported separately)',
};
export const THRESHOLDS = {
  reference: 'A (Relume React control) at the same route/viewport',
  semantic: 'score = 100% of SAC-expected roles present at every viewport AND role tree (tag, role, level, text) equal to A',
  responsive: 'column counts and section padding-top equal to A at every sweep width (375..1440, 64px steps) and no horizontal overflow',
  animation: 'translateY within 2 percentage points of column height of A at every probe sample; sticky stage = viewport (height == innerHeight, top == 0); reduced motion gives identity transform',
  tokenIntegrity: 'C only: boundShare = 100% (every governed declaration uses var(--fs-*)) and 0 DSC token mismatches/missing',
  visual: 'STRETCH: pixel mismatch <= 1% (pixelmatch threshold 0.1, includeAA false); SSIM and height difference reported',
  accessibility: '0 serious or critical axe violations per route/viewport',
  determinism: 'C only: pnpm generate:verify exit 0; generated files hash-equal to FROZEN.md; (bundle reproducibility reported separately)',
  licence: 'C only: 0 matching lines >= 40 chars against Arm A reference source (supplementary, not proof); 0 forbidden-string hits',
  build: 'pnpm build exit code 0',
  fonts: 'Source Sans 3 face loaded (document.fonts) on every page',
};

const rj = (...p) => { try { return JSON.parse(fs.readFileSync(path.join(...p), 'utf8')); } catch { return null; } };
const tol = 0.51;
const fmtPct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(x === 1 || x === 0 ? 0 : 2) + '%');
const sig = (r) => [r.tag, r.role, r.level, r.text].join('|');

/**
 * Governed-token accounting for an arm-C token-integrity.json under the given criteria.
 *  r1  : not used (raw boundShare).
 *  r2  : the r2 rule (exact strict/loose; `0px` is a literal) - stored `governedR2`, or `governed` of an r2-era file.
 *  r3  : the D-6 rule - stored `governed` when it was measured by an r3 harness, otherwise re-judged here from the
 *        complete raw literal list and the manifest (verified against the run's recorded manifest hash).
 */
export function governedView(tok, criteria, { det = null, manifestPath = null, runDir = null } = {}) {
  const al = tok.arm_level || {};
  if (criteria !== 'r3' && criteria !== 'r3.1') return { gv: al.governedR2 || al.governed, rejudged: false, source: 'stored (r2 rule)' };
  if (al.governed?.rule === 'r3' || al.governed?.unavailable) return { gv: al.governed, rejudged: false, source: 'stored (r3 measurement)' };
  const lits = al.rawLiterals || al.literalSamples;
  if (!lits || lits.length !== al.literalDecls) {
    return { gv: { unavailable: true, manifest: al.governed?.manifest ?? null }, rejudged: false,
      source: `cannot re-judge: only ${lits ? lits.length : 0} of ${al.literalDecls} raw literal declarations are stored - the r3 accounting applies from the next run` };
  }
  const expectSha = al.governed?.manifest?.sha256 || det?.generated?.hashes?.['generated-manifest.json'] || null;
  let entries = tok.manifestEntries, info = null;
  if (entries) info = { path: al.governed?.manifest?.path ?? null, entries: entries.length, embedded: true };
  else {
    // The manifest the run measured may have been regenerated since: take the first candidate whose sha256 equals the one recorded by the run.
    const cands = [manifestPath, al.governed?.manifest?.path, runDir && path.join(runDir, 'C', 'generated-manifest.json'),
      runDir && path.join(HARNESS_DIR, 'rejudge', path.basename(runDir), 'generated-manifest.json')].filter(Boolean);
    const tried = [];
    for (const mp of cands) {
      try {
        const buf = fs.readFileSync(mp);
        const sha = crypto.createHash('sha256').update(buf).digest('hex');
        tried.push(`${mp} (${sha.slice(0, 12)})`);
        if (expectSha && sha !== expectSha && mp !== manifestPath) continue; // an explicit --manifest is used as given, flagged below
        const u = parseUngoverned(JSON.parse(buf.toString('utf8')));
        entries = u.entries;
        info = { path: mp, entries: u.count, reasons: u.reasons, sha256: sha, runRecordedSha256: expectSha, shaMatchesRun: expectSha ? sha === expectSha : null };
        break;
      } catch { /* try the next candidate */ }
    }
    if (!entries) return { gv: { unavailable: true, manifest: { runRecordedSha256: expectSha, tried } }, rejudged: false,
      source: `cannot re-judge: no copy of the manifest this run measured (sha256 ${expectSha ? expectSha.slice(0, 12) : 'unknown'}) is available${tried.length ? `; found ${tried.join(', ')}` : ''} - pass --manifest <file> with the matching copy` };
  }
  const gv = judgeGovernedR3({ literals: lits, varDecls: al.varDecls, entries, manifestInfo: info });
  return { gv, rejudged: true, source: `re-judged from the stored ${al.rawLiterals ? 'rawLiterals' : 'literalSamples'} (${lits.length} literal declarations) and the manifest (${entries.length} entries, sha256 ${info.sha256 ? info.sha256.slice(0, 12) : 'embedded'}${info.shaMatchesRun === false ? ' - NOT the run-recorded manifest' : ''})` };
}

/**
 * Forbidden-string hits with classification and scope. Stored values (scan-time) are used when present; otherwise
 * they are re-derived from the files on disk under fb.root at summarise time (run r3 and earlier carry neither).
 * `manifestRevision` = the arm-c manifest dsc.revision the run recorded (C/determinism.json), else the one stored with the scan.
 */
function enrichForbiddenHits(fb, manifestRevision) {
  const rev = manifestRevision || fb.manifestRevision || null;
  let rederived = 0;
  const hits = (fb.hits || []).map((h) => {
    if (h.patternIndex === undefined) return h; // 'skipped: larger than limit' notes are not hits
    let o = h;
    let how = 'stored in licence.json (scan-time)';
    if (!h.classification) { o = { ...h, ...classifyHitOnDisk(fb.root, h.file, h.patternIndex) }; rederived++; how = `re-derived from the file on disk under ${fb.root} at summarise time (the stored hit has no classification)`; }
    const isOther = o.classification !== 'provenanceField' && o.classification !== 'builderAssignment';
    if (isOther && !o.scope) o = { ...o, scope: scopeOfFile(fb.root, h.file, rev) };
    return { ...o, classificationSource: how };
  });
  const real = hits.filter((h) => h.patternIndex !== undefined);
  return { hits, real, rederived, counts: countClassifications(hits), manifestRevision: rev };
}

export function summarise(runDir, { criteria = 'r3', suffix = '', outDir = null, manifestPath = null } = {}) {
  if (!['r1', 'r2', 'r3', 'r3.1'].includes(criteria)) throw new Error(`unknown --criteria ${criteria} (r1|r2|r3|r3.1)`);
  const R31 = criteria === 'r3.1'; // r3.1 = r3 + the OD-47 classification of forbidden-string hits (nothing else differs)
  const R3 = criteria === 'r3' || R31;
  const R2 = criteria === 'r2' || R3; // r3 keeps every r2 refinement
  runDir = path.resolve(runDir);
  const writeDir = outDir ? path.resolve(outDir) : runDir;
  fs.mkdirSync(writeDir, { recursive: true });
  const run = rj(runDir, 'run.json') || {};
  const arms = ARM_ORDER.filter((a) => fs.existsSync(path.join(runDir, a)));
  const data = {};
  for (const a of arms) {
    const d = path.join(runDir, a);
    data[a] = {
      build: rj(d, 'build.json'), dom: rj(d, 'dom-roles.json'), geo: rj(d, 'geometry.json'), resp: rj(d, 'responsive.json'), scroll: rj(d, 'scroll-probe.json'),
      tok: rj(d, 'token-integrity.json'), vis: rj(d, 'visual.json'), a11y: rj(d, 'accessibility.json'), meta: rj(d, 'page-meta.json'),
      det: rj(d, 'determinism.json'), lic: rj(d, 'licence.json'), err: rj(d, 'error.json'),
    };
  }
  const A = data.A || null;
  const tokenAccounting = {};
  let determinismInputs = null;
  const out = { runDir, label: run.label || path.basename(runDir), generatedAt: new Date().toISOString(), dryRun: !!run.dryRun, criteria, referencePresent: !!A, thresholds: R3 ? { ...THRESHOLDS, ...R2_OVERRIDES, ...R3_OVERRIDES, ...(R31 ? R31_OVERRIDES : {}) } : R2 ? { ...THRESHOLDS, ...R2_OVERRIDES } : THRESHOLDS, arms: {} };
  out.runCriteria = run.criteria || null;

  for (const arm of arms) {
    const D = data[arm];
    const isRef = arm === 'A';
    const isC = arm === 'C' || arm === 'Cssr';
    const checks = [];
    const add = (c) => checks.push({ arm, level: 'required', ...c });
    // status helper: REF for the reference arm, MISSING when no data
    const verdict = (cond) => (isRef ? 'REF' : cond ? 'PASS' : 'FAIL');

    if (D.err) add({ dimension: 'run', route: '-', name: 'arm run error', status: 'FAIL', value: D.err.error?.slice?.(0, 200) || D.err, threshold: 'no errors' });

    // build
    if (D.build) {
      const b = D.build;
      const js = b.bundle ? Object.entries(b.bundle.byExt).filter(([e]) => e === '.js' || e === '.css').map(([e, v]) => `${e} ${v.bytes}B (gz ${v.gzipBytes}B)`).join(', ') : 'no dist found';
      add({ dimension: 'build', route: '-', name: 'pnpm build exit code', value: b.ran === false ? (b.error || 'not run') : `exit ${b.exitCode}; ${js}`, threshold: 'exit 0',
        status: b.ran === false && !b.dryRun ? 'MISSING' : b.dryRun ? 'INFO' : b.exitCode === 0 ? 'PASS' : 'FAIL' });
    }

    // fonts
    if (D.meta) for (const route of ROUTES) {
      const rows = D.meta.routes?.[route] || {};
      const vals = VPS.map((w) => rows[w]).filter(Boolean);
      if (!vals.length) { add({ dimension: 'fonts', route, name: 'Source Sans 3 loaded', status: 'MISSING', value: null, threshold: 'loaded' }); continue; }
      const notLoaded = VPS.filter((w) => rows[w] && !rows[w].fonts?.source_sans_3_loaded);
      const ext = VPS.filter((w) => rows[w]?.externalRequests?.length);
      add({ dimension: 'fonts', route, name: 'Source Sans 3 loaded; no external requests', status: notLoaded.length || ext.length ? 'FAIL' : 'PASS',
        value: notLoaded.length || ext.length ? { fontNotLoadedAt: notLoaded, externalRequestsAt: ext } : 'loaded at all viewports', threshold: 'loaded, 0 external' });
    }

    // semantic
    if (D.dom) for (const route of ROUTES) {
      const per = {};
      let allScore = true, allEq = true, anyData = false, eqKnown = !!A?.dom;
      for (const w of VPS) {
        const e = D.dom.routes?.[route]?.[w];
        if (!e || e.error) { per[w] = { error: e?.error || 'missing' }; allScore = false; continue; }
        anyData = true;
        const s = e.semantic;
        const row = { score: s?.score, visibleScore: s?.visibleScore, missing: s?.missing?.length ? s.missing : undefined, counts: e.counts };
        if (s?.score !== 1) allScore = false;
        const ae = A?.dom?.routes?.[route]?.[w];
        if (ae && !ae.error && !isRef) {
          const a = ae.roles.map(sig), b = e.roles.map(sig);
          const eq = a.length === b.length && a.every((x, i) => x === b[i]);
          const av = ae.roles.filter((r) => r.visible).map(sig), bv = e.roles.filter((r) => r.visible).map(sig);
          row.treeEqualA = eq; row.visibleTreeEqualA = av.length === bv.length && av.every((x, i) => x === bv[i]);
          row.treeLen = { arm: b.length, A: a.length };
          if (!eq) { allEq = false; const i = a.findIndex((x, k) => x !== b[k]); row.firstDiff = { index: i < 0 ? Math.min(a.length, b.length) : i, A: a[i] ?? null, arm: b[i] ?? null }; }
        } else if (!isRef) eqKnown = false;
        per[w] = row;
      }
      const scoreMap = Object.fromEntries(VPS.map((w) => [w, per[w]?.score ?? null]));
      const treeMap = isRef ? null : Object.fromEntries(VPS.map((w) => [w, per[w]?.treeEqualA ?? null]));
      if (R2) {
        add({ dimension: 'semantic', route, name: 'SAC-expected roles present', status: !anyData ? 'MISSING' : isRef ? 'REF' : allScore ? 'PASS' : 'FAIL', threshold: '100% at every viewport',
          value: { score: scoreMap, missing: Object.fromEntries(VPS.map((w) => [w, per[w]?.missing ?? []])) } });
        if (!isRef) add({ dimension: 'semantic', route, level: 'info', name: 'role tree vs A (informational)', status: !anyData ? 'MISSING' : 'INFO', threshold: 'n/a (A has its own defects)',
          value: { treeEqualA: treeMap, visibleTreeEqualA: Object.fromEntries(VPS.map((w) => [w, per[w]?.visibleTreeEqualA ?? null])), firstDiff: Object.fromEntries(VPS.map((w) => [w, per[w]?.firstDiff ?? null])) } });
      } else {
        const status = !anyData ? 'MISSING' : isRef ? 'REF' : allScore && allEq && eqKnown ? 'PASS' : allScore && allEq && !eqKnown ? 'MISSING' : 'FAIL';
        add({ dimension: 'semantic', route, name: 'expected roles + role tree vs A', status, threshold: '100% roles, tree == A', value: { score: scoreMap, treeEqualA: treeMap, detail: per } });
      }
    }

    // responsive
    if (D.resp) for (const route of SWEEP_ROUTES) {
      const rr = D.resp.routes?.[route];
      if (!rr) { add({ dimension: 'responsive', route, name: 'sweep', status: 'MISSING', value: null, threshold: 'matches A' }); continue; }
      const widths = D.resp.widths || Object.keys(rr).map(Number);
      const overflow = [], colMis = [], padMis = [], errors = [];
      let padNoData = false;
      for (const w of widths) {
        const s = rr[w];
        if (!s || s.error) { errors.push(w); continue; }
        if (s.overflowX) overflow.push(w);
        const a = A?.resp?.routes?.[route]?.[w];
        if (a && !a.error && !isRef) {
          for (const k of Object.keys(a.columns || {})) if (a.columns[k] !== s.columns?.[k]) colMis.push({ w, section: k, A: a.columns[k], arm: s.columns?.[k] ?? null });
          const pa = (x) => parseFloat(x);
          if (R2) {
            if (!a.sectionPadding || !s.sectionPadding) padNoData = true;
            else for (const k of Object.keys(a.sectionPadding)) {
              if (!a.sectionPadding[k]) continue; // A has no such section element: nothing to compare against
              const bs = s.sectionPadding[k];
              if (!bs || Math.abs(pa(a.sectionPadding[k].paddingTop) - pa(bs.paddingTop)) > tol) padMis.push({ w, section: k, A: a.sectionPadding[k].paddingTop, arm: bs?.paddingTop ?? null, armTag: bs?.tag });
            }
          } else {
            if (Math.abs(pa(a.subject.paddingTop) - pa(s.subject.paddingTop)) > tol) padMis.push({ w, section: 'subject', A: a.subject.paddingTop, arm: s.subject.paddingTop });
            for (const k of Object.keys(a.sections || {})) {
              const bs = s.sections?.[k];
              if (!bs || Math.abs(pa(a.sections[k].paddingTop) - pa(bs.paddingTop)) > tol) padMis.push({ w, section: k, A: a.sections[k].paddingTop, arm: bs?.paddingTop ?? null });
            }
          }
        }
      }
      const refMissing = (!A?.resp && !isRef) || padNoData;
      const ok = !overflow.length && !colMis.length && !padMis.length && !errors.length;
      add({ dimension: 'responsive', route, name: 'columns/padding == A, no overflow', threshold: 'all widths match A, no overflow',
        status: isRef ? 'REF' : refMissing ? 'MISSING' : ok ? 'PASS' : 'FAIL',
        value: { padding: R2 ? 'nearest section containing the route heading' : 'subject wrapper + located sections', note: padNoData ? 'sectionPadding absent: re-measure with the r2 harness' : undefined, widthsChecked: widths.length, overflowAt: overflow, columnMismatches: colMis.slice(0, 20), paddingMismatches: padMis.slice(0, 20), errors } });
    }

    // animation
    if (D.scroll) {
      const tr = {}, st = {}, rm = {};
      let trOk = true, stOk = true, rmOk = true, trKnown = true;
      for (const w of VPS) {
        const v = D.scroll.viewports?.[w];
        if (!v || v.error) { trOk = stOk = rmOk = false; continue; }
        const av = A?.scroll?.viewports?.[w];
        const dev = { left: [], right: [] };
        for (const s of v.samples) {
          const as = av?.samples?.find((x) => x.p === s.p);
          for (const side of ['left', 'right']) {
            const pct = s[side].found ? s[side].translateYPct : null;
            const apct = as?.[side]?.found ? as[side].translateYPct : null;
            if (!as || pct == null || apct == null) { dev[side].push({ p: s.p, arm: pct, A: apct, diff: null }); if (!isRef && (pct == null)) trOk = false; if (!as) trKnown = false; continue; }
            const diff = Math.abs(pct - apct);
            dev[side].push({ p: s.p, arm: pct, A: apct, diff: Math.round(diff * 100) / 100 });
            if (diff > 2) trOk = false;
          }
        }
        tr[w] = { hasTransform: v.hasTransform, deviations: dev, maxDiff: Math.max(0, ...[...dev.left, ...dev.right].map((d) => d.diff ?? 0)) };
        const stageBad = v.samples.filter((s) => !s.stage.found || Math.abs(s.stage.height - s.stage.innerHeight) > 1 || Math.abs(s.stage.top) > 1);
        st[w] = { stickyFound: v.stickyFound, offending: stageBad.map((s) => ({ p: s.p, ...s.stage })) };
        if (stageBad.length) stOk = false;
        rm[w] = { identity: v.reducedMotion?.identity ?? null, tyLeft: v.reducedMotion?.left?.ty, tyRight: v.reducedMotion?.right?.ty, matchMedia: v.reducedMotion?.mediaMatches };
        if (v.reducedMotion?.identity !== true) rmOk = false;
      }
      add({ dimension: 'animation', route: 'header80', name: 'translateY vs A (<=2% of column height)', threshold: '<=2 pct points', status: isRef ? 'REF' : !A?.scroll || !trKnown ? 'MISSING' : trOk ? 'PASS' : 'FAIL', value: tr });
      add({ dimension: 'animation', route: 'header80', name: 'sticky stage = viewport', threshold: 'height==innerHeight, top==0', status: verdict(stOk), value: st });
      add({ dimension: 'animation', route: 'header80', name: 'reduced motion honoured', threshold: 'identity transform', status: verdict(rmOk), value: rm });
    }

    // token integrity
    if (D.tok) {
      const al = D.tok.arm_level || {};
      const tk = D.tok.tokens;
      const view = isC && R2 ? governedView(D.tok, criteria, { det: data.C?.det, manifestPath, runDir }) : null;
      const gv = view ? view.gv : al.governed;
      if (view) tokenAccounting[arm] = { rule: gv?.rule ?? 'r2', source: view.source, rejudged: view.rejudged, boundShareGoverned: gv?.boundShareGoverned ?? null, coverage: gv?.coverage ?? null, zeroLengthNeutral: gv?.zeroLengthNeutral ?? null, uncoveredLiteralDecls: gv?.uncoveredLiteralDecls ?? null };
      if (isC && R2) {
        add({ dimension: 'tokens', route: 'ALL', name: 'boundShare over DSC-governed declarations = 100%', threshold: R3 ? '100% (D-6 accounting: zero lengths neutral; manifest coverage strict/loose/viaShorthand)' : '100% (manifest-listed ungoverned literals excluded)',
          status: !gv || gv.unavailable ? 'MISSING' : gv.boundShareGoverned === 1 ? 'PASS' : 'FAIL',
          value: !gv || gv.unavailable ? { note: view.source !== 'stored (r2 rule)' && view.source !== 'stored (r3 measurement)' ? view.source : 'generated-manifest.json ungoverned[] not readable', manifest: gv?.manifest ?? null }
            : { boundShareGoverned: gv.boundShareGoverned, rule: gv.rule ?? 'r2', accounting: view.source, rawBoundShare_info: al.boundShare, varDecls: al.varDecls, rawLiteralDecls: al.literalDecls, unreadableValueDecls: al.unreadableValueDecls,
                ...(R3 ? { zeroLengthNeutral: gv.zeroLengthNeutral, coverage: gv.coverage, viaShorthandScope: gv.viaShorthandScope } : {}),
                excludedByManifest: gv.excludedByManifest, excludedStrict: gv.excludedStrict, excludedLoose_fileNotIdentifiable: gv.excludedLoose,
                uncoveredLiteralDecls: gv.uncoveredLiteralDecls, uncoveredLiterals: (gv.uncoveredLiterals || []).slice(0, 15), manifest: gv.manifest } });
        add({ dimension: 'tokens', route: 'ALL', name: 'DSC token values (computed :root) have 0 mismatches', threshold: '0 mismatches, 0 missing',
          status: tk && tk.mismatchCount === 0 && tk.missingCount === 0 ? 'PASS' : 'FAIL',
          value: tk ? { tokenCount: tk.tokenCount, ok: tk.ok, mismatches: tk.mismatches?.slice(0, 20), missing: tk.missing?.slice(0, 20) } : 'no token data' });
      } else if (isC) {
        add({ dimension: 'tokens', route: 'ALL', name: 'boundShare = 100%', threshold: '100% var(--fs-*)', status: al.boundShare === 1 ? 'PASS' : 'FAIL',
          value: { boundShare: al.boundShare, boundShareStrict: al.boundShareStrict, varDecls: al.varDecls, literalDecls: al.literalDecls, otherVarDecls: al.otherVarDecls, mixedVarDecls: al.mixedVarDecls, literalSamples: (al.literalSamples || []).slice(0, 15) } });
        add({ dimension: 'tokens', route: 'ALL', name: 'DSC token values (computed :root) have 0 mismatches', threshold: '0 mismatches, 0 missing',
          status: tk && tk.mismatchCount === 0 && tk.missingCount === 0 ? 'PASS' : 'FAIL',
          value: tk ? { tokenCount: tk.tokenCount, ok: tk.ok, mismatches: tk.mismatches?.slice(0, 20), missing: tk.missing?.slice(0, 20) } : 'no token data' });
      } else {
        add({ dimension: 'tokens', route: 'ALL', name: 'boundShare (informational)', threshold: 'n/a (C only)', status: 'INFO', level: 'info',
          value: { boundShare: al.boundShare, varDecls: al.varDecls, literalDecls: al.literalDecls, otherVarDecls: al.otherVarDecls } });
      }
      for (const route of ROUTES) {
        const p = D.tok.perPage?.[route]?.[1440];
        if (!p) continue;
        let share;
        if (isC && R2 && view?.rejudged) share = view.gv.uncoveredLiteralDecls === 0 ? (p.var > 0 ? 1 : null) : undefined; // every page literal is in the union list: none uncovered => share 1 (derived)
        else if (isC && R2) share = R3 && al.governed?.rule === 'r3' ? p.boundShareGoverned : R3 ? undefined : (p.boundShareGovernedR2 !== undefined ? p.boundShareGovernedR2 : p.boundShareGoverned);
        else share = p.boundShare;
        add({ dimension: 'tokens', route, name: isC && R2 ? 'governed boundShare @1440' : 'boundShare @1440', threshold: isC ? '100%' : 'n/a',
          status: isC ? (R2 && share === undefined ? 'MISSING' : share === 1 ? 'PASS' : 'FAIL') : 'INFO', level: isC ? 'required' : 'info',
          value: { share, rawBoundShare: p.boundShare, var: p.var, literal: p.literal, excludedByManifest: p.excludedByManifest, ...(view?.rejudged && share !== undefined ? { derivedFromUnionRejudge: true } : {}) } });
      }
    }

    // visual
    if (D.vis && !isRef) for (const route of ROUTES) {
      const rows = D.vis.routes?.[route] || {};
      const vals = {};
      let ok = true, any = false;
      for (const w of VPS) {
        const r = rows[w];
        if (!r || r.error || r.missing) { vals[w] = r || null; ok = false; continue; }
        any = true;
        vals[w] = { mismatch: fmtPct(r.mismatchRatio), mismatchRatio: r.mismatchRatio, ssim: r.ssim, heightDiff: r.heightDiff, widthDiff: r.widthDiff };
        if (r.mismatchRatio > 0.01) ok = false;
      }
      add({ dimension: 'visual', route, name: 'pixel mismatch vs A', threshold: '<=1% (stretch); SSIM + height diff reported', level: 'stretch', status: !any ? 'MISSING' : ok ? 'PASS' : 'FAIL', value: vals });
    }

    // accessibility
    if (D.a11y) for (const route of ROUTES) {
      const per = {};
      let bad = 0, any = false;
      for (const w of VPS) {
        const e = D.a11y.routes?.[route]?.[w];
        if (!e || e.error) { per[w] = e || null; bad += 1; continue; }
        any = true;
        const sc = (e.byImpact?.serious || 0) + (e.byImpact?.critical || 0);
        bad += sc;
        per[w] = { byImpact: e.byImpact, seriousOrCritical: sc, violations: (e.violations || []).filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
          focusIndicator: e.focusVisible?.found ? e.focusVisible.indicatorVisible : null };
      }
      add({ dimension: 'accessibility', route, name: 'axe serious+critical', threshold: '0', status: !any ? 'MISSING' : bad === 0 ? 'PASS' : 'FAIL', value: per });
    }
    if (D.a11y && !isRef) for (const route of ['navbar', 'cta25']) {
      const per = {};
      for (const w of VPS) {
        const e = D.a11y.routes?.[route]?.[w], ae = A?.a11y?.routes?.[route]?.[w];
        if (!e?.tabSequence || !ae?.tabSequence) { per[w] = null; continue; }
        const f = (s) => s.map((x) => `${x.tag}:${x.text}`);
        per[w] = JSON.stringify(f(e.tabSequence)) === JSON.stringify(f(ae.tabSequence)) ? 'same as A' : { arm: f(e.tabSequence), A: f(ae.tabSequence) };
      }
      add({ dimension: 'accessibility', route, name: 'Tab order vs A (informational)', threshold: 'n/a', status: 'INFO', level: 'info', value: per });
    }

    // determinism + licence (C only)
    if (arm === 'C') {
      if (D.det) {
        // D-7: which FROZEN file and verify script were used. Runs recorded by an r1/r2-era harness hard-coded FROZEN.md and `generate:verify`.
        const recorded = D.det.selectionBasis !== undefined;
        const base = (f) => (f ? String(f).split('/').pop() : null);
        const sel = recorded
          ? { frozenFile: base(D.det.frozenFile), verifyScript: D.det.verifyScript, manifestRevision: D.det.manifestRevision, selectionBasis: D.det.selectionBasis, selectionOk: D.det.selection?.ok !== false }
          : { frozenFile: base(D.det.frozenRoot?.file || D.det.frozen?.file), verifyScript: D.det.generateVerify?.script || 'generate:verify', manifestRevision: null,
              selectionBasis: 'not recorded: hard-coded FROZEN.md and generate:verify (harness before the D-7 fix)', selectionOk: null };
        determinismInputs = { ...sel, recorded };
        const stale = R3 && !recorded; // r3 cannot accept a comparison made against a hard-coded (possibly wrong-generation) FROZEN file / verify script
        const staleNote = 'determinism was recorded with a hard-coded FROZEN.md / generate:verify (D-7): re-run the determinism step with the r3 harness';
        add({ dimension: 'determinism', route: '-', level: 'info', name: R3 ? 'inputs selected for the check (D-7: by manifest dsc.revision)' : 'inputs used for the check', threshold: 'n/a', status: 'INFO',
          value: `FROZEN file ${sel.frozenFile || 'NONE'}; verify script ${sel.verifyScript}; manifest dsc.revision ${sel.manifestRevision || 'n/a'}; basis: ${typeof sel.selectionBasis === 'string' ? sel.selectionBasis : `frozen - ${sel.selectionBasis.frozen}; verify - ${sel.selectionBasis.verifyScript}`}` });
        add({ dimension: 'determinism', route: '-', name: `pnpm ${sel.verifyScript} exit code`, threshold: 'exit 0', status: stale ? 'MISSING' : D.det.generateVerify?.exitCode === 0 ? 'PASS' : 'FAIL',
          value: stale ? { note: staleNote, recordedExit: D.det.generateVerify?.exitCode, verifyScript: sel.verifyScript } : `exit ${D.det.generateVerify?.exitCode} (${sel.verifyScript})` });
        const f = R2 && D.det.frozenRoot ? D.det.frozenRoot : D.det.frozen;
        add({ dimension: 'determinism', route: '-', name: R2 ? `every ${sel.frozenFile || 'FROZEN'} entry (root-relative) matches disk` : 'generated/ hashes == FROZEN.md', threshold: 'all equal',
          status: stale ? 'MISSING' : !f ? 'MISSING' : f.missing ? 'FAIL' : f.allMatch ? 'PASS' : 'FAIL',
          value: stale ? { note: staleNote, recordedFile: sel.frozenFile }
            : f ? { frozenFile: sel.frozenFile, verifyScript: sel.verifyScript, manifestRevision: sel.manifestRevision, selectionBasis: sel.selectionBasis, files: D.det.generated?.fileCount, unlisted: f.unlisted?.slice?.(0, 10), frozenEntries: f.frozenEntries, matched: f.matched, mismatched: f.mismatched, notInFrozen: f.notInFrozen?.slice?.(0, 10), frozenNotOnDisk: f.frozenNotOnDisk?.slice?.(0, 10), aggregateFound: f.aggregateFound, missingFile: f.missing, reason: f.reason } : null });
        const br = D.det.bundleReproducibility;
        add({ dimension: 'determinism', route: '-', name: 'bundle reproducibility (two builds, reported separately)', threshold: 'identical dist hashes (info)', level: 'info', status: br?.identical ? 'PASS' : br?.buildDir ? 'FAIL' : 'MISSING',
          value: br ? { exitCodes: br.exitCodes, fileCounts: br.fileCounts, differingFiles: br.differingFiles?.slice(0, 20) } : null });
      } else add({ dimension: 'determinism', route: '-', name: 'determinism', threshold: 'exit 0', status: 'MISSING', value: 'step not run' });
      if (D.lic) {
        const l = D.lic.licenceLines, fb = D.lic.forbiddenStrings;
        const nonImport = R2 && l.matchCountExclImports !== undefined ? l.matchCountExclImports : l.matchCount;
        if (R2 && l.importLineMatchCount !== undefined) add({ dimension: 'licence', route: '-', level: 'info', name: 'import-line matches (excluded from the check, reported separately)', threshold: 'n/a', status: 'INFO',
          value: { importLineMatchCount: l.importLineMatchCount, locations: l.importLineMatches?.slice(0, 20).map((m) => `${m.file}:${m.line} ${m.sha256.slice(0, 12)}`) } });
        add({ dimension: 'licence', route: '-', name: R2 ? 'matching non-import lines >= 40 chars vs Arm A source (supplementary, not proof)' : 'matching lines >= 40 chars vs Arm A source (supplementary, not proof)', threshold: '0', status: nonImport === 0 ? 'PASS' : 'FAIL',
          value: { matchCount: nonImport, uniqueHashes: l.uniqueMatchingHashes, scannedLines: l.scannedLines, referenceLines: l.referenceLines, locations: l.matches?.filter((m) => !(R2 && m.importLine)).slice(0, 20).map((m) => `${m.file}:${m.line} ${m.sha256.slice(0, 12)}`) } });
        const enr = enrichForbiddenHits(fb, D.det?.manifestRevision);
        if (R31) {
          // r3.1 (OD-47): every hit is still listed; it passes only when every hit is provenanceField or builderAssignment.
          const { hits, real, rederived, counts } = enr;
          const listing = real.map((h) => `${h.file} [pattern ${h.patternIndex}] ${h.classification}${h.classification === 'builderAssignment' ? ` lines ${h.lines.join(',')}` : ''}${h.classification === 'provenanceField' ? ` ${h.fields.join(',')}` : ''}${h.classification === 'other' ? ` (scope ${h.scope})${h.reason ? ` - ${h.reason}` : ''}` : ''}`);
          add({ dimension: 'licence', route: '-', name: 'forbidden strings under experiment dir (r3.1: provenance fields / builder assignments only)', threshold: '0 hits other than provenanceField or builderAssignment', status: counts.other === 0 ? 'PASS' : 'FAIL',
            value: { criteria: 'r3.1 (amendment under OD-47)', hitCount: fb.hitCount, filesScanned: fb.filesScanned, counts, scopeBasis: `manifest dsc.revision ${enr.manifestRevision || 'n/a'} (scope is informational only)`, classificationSource: rederived ? `${rederived} of ${real.length} hit(s) re-derived from the files on disk at summarise time (the stored licence.json hits carry no classification); the files may have changed since the run` : 'stored in licence.json', listing, hits: hits.slice(0, 50) } });
        } else add({ dimension: 'licence', route: '-', name: 'forbidden strings under experiment dir', threshold: '0 hits', status: fb.hitCount === 0 ? 'PASS' : 'FAIL', value: { hitCount: fb.hitCount, filesScanned: fb.filesScanned, hits: fb.hits?.slice(0, 20), informational: { otherByScope: enr.counts.otherByScope, counts: enr.counts, scopeBasis: `manifest dsc.revision ${enr.manifestRevision || 'n/a'}` } } });
      } else add({ dimension: 'licence', route: '-', name: 'licence check', threshold: '0', status: 'MISSING', value: 'step not run (run after C is frozen: --licence)' });
    }

    const tally = (lvl) => {
      const rows = checks.filter((c) => c.level === lvl);
      const count = (s) => rows.filter((c) => c.status === s).length;
      return { pass: count('PASS'), fail: count('FAIL'), missing: count('MISSING'), ref: count('REF'), total: rows.length };
    };
    out.arms[arm] = { reference: isRef, verdict: { required: tally('required'), stretch: tally('stretch'), info: tally('info') }, checks };
  }
  out.aReferenceAnomalies = referenceAnomalies(A);
  out.determinismInputs = determinismInputs;
  out.tokenAccounting = tokenAccounting;
  fs.writeFileSync(path.join(writeDir, `summary${suffix}.json`), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(writeDir, `summary${suffix}.md`), renderMd(out));
  const tl = Object.entries(out.arms).map(([a, r]) => `${a}: ${r.reference ? 'reference' : `${r.verdict.required.pass} pass / ${r.verdict.required.fail} fail / ${r.verdict.required.missing} missing`}`).join('; ');
  console.log(`  wrote ${path.join(writeDir, `summary${suffix}.json`)} and summary${suffix}.md [${criteria}]  (${tl})`);
  return out;
}

export function referenceAnomalies(A) {
  if (!A) return { present: false };
  const semantic = [], axe = [];
  for (const route of ROUTES) for (const w of VPS) {
    const e = A.dom?.routes?.[route]?.[w];
    if (e && !e.error && e.semantic && e.semantic.score !== 1) semantic.push({ route, width: w, score: e.semantic.score, missing: e.semantic.missing, h1Count: e.semantic.h1Count });
    const a = A.a11y?.routes?.[route]?.[w];
    const hits = (a?.violations || []).filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (hits.length) axe.push({ route, width: w, violations: hits.map((v) => ({ id: v.id, impact: v.impact, nodeCount: v.nodeCount })) });
  }
  return { present: true, semantic, axe };
}

const cell = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return '`' + JSON.stringify(v).replace(/\|/g, '/') + '`';
};
const short = (v, n = 160) => { const s = cell(v); return s.length > n ? s.slice(0, n) + '…`' : s; };

function renderMd(s) {
  const L = [];
  L.push(`# PEN-CLOUD-03-B acceptance summary${s.dryRun ? ' (DRY RUN - stub arms, not a result)' : ''}`, '');
  const critNote = s.criteria === 'r3.1' ? ' (= r3, plus the OD-47 amendment: forbidden-string hits are classified provenanceField / builderAssignment / other and only `other` hits fail; patterns and detection unchanged)'
    : s.criteria === 'r3' ? ' (= r2: semantic roles only; section padding; root-relative FROZEN; import lines excluded - plus D-6 token accounting and D-7 FROZEN/verify-script selection)'
    : s.criteria === 'r2' ? ' (semantic: roles only; governed token share; section padding; root-relative FROZEN; import lines excluded)' : ' (original acceptance wording)';
  L.push(`Criteria: **${s.criteria}**${critNote}${s.runCriteria && s.runCriteria !== s.criteria ? `  ·  re-judged: the run was recorded under ${s.runCriteria}` : ''}`, '');
  if (s.determinismInputs) {
    const d = s.determinismInputs;
    L.push(`Determinism inputs: FROZEN file **${d.frozenFile || 'NONE'}**; verify script **${d.verifyScript}**; manifest dsc.revision \`${d.manifestRevision || 'n/a'}\`; basis: ${typeof d.selectionBasis === 'string' ? d.selectionBasis : `${d.selectionBasis.frozen}; ${d.selectionBasis.verifyScript}`}`, '');
  }
  for (const [a, t] of Object.entries(s.tokenAccounting || {})) {
    L.push(`Token accounting (${a}): rule ${t.rule}; governed share ${fmtPct(t.boundShareGoverned)}${t.coverage ? `; coverage strict ${t.coverage.strict} / loose ${t.coverage.loose} / viaShorthand ${t.coverage.viaShorthand} / uncovered ${t.coverage.uncovered}; zero-length neutral ${t.zeroLengthNeutral}` : `; uncovered ${t.uncoveredLiteralDecls ?? 'n/a'}`}; ${t.source}`, '');
  }
  L.push(`Run: \`${s.label}\`  ·  generated ${s.generatedAt}  ·  reference arm A ${s.referencePresent ? 'present' : '**absent** (comparisons marked MISSING)'}`, '');
  L.push('## Verdict (required checks)', '', '| Arm | PASS | FAIL | MISSING | stretch PASS/FAIL |', '|---|---|---|---|---|');
  for (const [a, r] of Object.entries(s.arms)) {
    if (r.reference) L.push(`| ${a} | reference | | | |`);
    else L.push(`| ${a} | ${r.verdict.required.pass} | ${r.verdict.required.fail} | ${r.verdict.required.missing} | ${r.verdict.stretch.pass}/${r.verdict.stretch.fail} |`);
  }
  L.push('', '## A reference anomalies', '', 'Defects in the Relume control itself (arm A). They are not C defects and are not scored; they are listed so they are not mistaken for C results.', '');
  const an = s.aReferenceAnomalies;
  if (!an?.present) L.push('_Arm A not in this run._');
  else {
    L.push(`- **A semantic score below 1:** ${an.semantic.length ? '' : 'none'}`);
    for (const x of an.semantic) L.push(`  - ${x.route} @${x.width}: score ${x.score}; missing ${JSON.stringify(x.missing)}${x.h1Count !== undefined ? `; h1 count ${x.h1Count}` : ''}`);
    L.push(`- **A axe serious/critical:** ${an.axe.length ? '' : 'none'}`);
    for (const x of an.axe) L.push(`  - ${x.route} @${x.width}: ${x.violations.map((v) => `${v.id} (${v.impact}, ${v.nodeCount} nodes)`).join(', ')}`);
  }
  L.push('', '## Dimension matrix', '');
  const dims = [...new Set(Object.values(s.arms).flatMap((r) => r.checks.map((c) => c.dimension)))];
  L.push(`| Dimension | ${Object.keys(s.arms).join(' | ')} |`, `|---|${Object.keys(s.arms).map(() => '---').join('|')}|`);
  for (const d of dims) {
    const row = Object.entries(s.arms).map(([a, r]) => {
      const cs = r.checks.filter((c) => c.dimension === d);
      if (!cs.length) return '';
      const req = cs.filter((c) => c.level === 'required');
      const f = (cs.length ? cs : []).filter((c) => c.status === 'FAIL').length;
      const p = cs.filter((c) => c.status === 'PASS').length;
      const m = cs.filter((c) => c.status === 'MISSING').length;
      if (r.reference) return 'REF';
      if (!req.length && !f && !p) return 'info';
      return f ? `FAIL (${f}/${cs.length})` : m ? `MISSING (${m})` : p ? `PASS (${p})` : 'info';
    });
    L.push(`| ${d} | ${row.join(' | ')} |`);
  }
  L.push('', '## Thresholds', '');
  for (const [k, v] of Object.entries(s.thresholds)) L.push(`- **${k}**: ${v}`);
  for (const d of dims) {
    L.push('', `## ${d}`, '', '| Arm | Route | Check | Measured | Threshold | Status |', '|---|---|---|---|---|---|');
    for (const [a, r] of Object.entries(s.arms)) for (const c of r.checks.filter((x) => x.dimension === d)) {
      const lvl = c.level === 'required' ? '' : ` _(${c.level})_`;
      L.push(`| ${a} | ${c.route} | ${c.name}${lvl} | ${short(compactValue(d, c.value), d === 'determinism' || d === 'tokens' ? 420 : 160)} | ${c.threshold || ''} | **${c.status}** |`);
    }
  }
  L.push('', '_Full per-viewport/per-sample values are in summary.json and the per-arm JSON files._', '');
  return L.join('\n');
}

function compactValue(dim, v) {
  if (v == null || typeof v !== 'object') return v;
  if (dim === 'semantic') return { score: v.score, treeEqualA: v.treeEqualA };
  if (dim === 'animation' && v[1440]?.deviations) return Object.fromEntries(Object.entries(v).map(([w, x]) => [w, { maxDiff: x.maxDiff, transform: x.hasTransform }]));
  if (dim === 'visual') return Object.fromEntries(Object.entries(v).map(([w, x]) => [w, x ? `${x.mismatch} ssim ${x.ssim} dH ${x.heightDiff}` : null]));
  if (dim === 'accessibility') return Object.fromEntries(Object.entries(v).map(([w, x]) => [w, x?.seriousOrCritical ?? x]));
  return v;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const opts = { criteria: 'r3', out: null, suffix: null, manifest: null };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const m = /^--(criteria|out|suffix|manifest)(?:=(.*))?$/.exec(args[i]);
    if (m) opts[m[1]] = m[2] !== undefined ? m[2] : args[++i];
    else if (args[i].startsWith('--')) { console.error(`unknown option ${args[i]}`); process.exit(2); }
    else pos.push(args[i]);
  }
  if (!pos.length) {
    console.error('usage: node summarise.mjs <run-dir> [--criteria r1|r2|r3|r3.1] [--out <dir>] [--suffix <s>] [--manifest <file>]\n'
      + '  default criteria r3 (OD-51). When the criteria differ from the ones the run was recorded under, the files are written as summary-<criteria>.{json,md}\n'
      + '  so the original summary is not overwritten; --out writes into another directory instead of the run directory.');
    process.exit(2);
  }
  const runJson = rj(path.resolve(pos[0]), 'run.json') || {};
  const suffix = opts.suffix !== null ? opts.suffix : runJson.criteria && runJson.criteria !== opts.criteria ? `-${opts.criteria}` : '';
  summarise(pos[0], { criteria: opts.criteria, suffix, outDir: opts.out, manifestPath: opts.manifest });
}
