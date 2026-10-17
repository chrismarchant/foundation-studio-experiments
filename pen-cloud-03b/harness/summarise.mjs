#!/usr/bin/env node
// Reads a harness run directory and emits summary.json + summary.md (PASS/FAIL against the PEN-CLOUD-03-B thresholds).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ARM_ORDER = ['A', 'B', 'Bp', 'C', 'Cssr'];
const ROUTES = ['button', 'navbar', 'header80', 'layout620', 'testimonial37', 'cta25', 'page'];
const VPS = [1440, 768, 375];
const SWEEP_ROUTES = ['layout620', 'testimonial37', 'header80', 'page'];

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

export function summarise(runDir) {
  runDir = path.resolve(runDir);
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
  const out = { runDir, label: run.label || path.basename(runDir), generatedAt: new Date().toISOString(), dryRun: !!run.dryRun, referencePresent: !!A, thresholds: THRESHOLDS, arms: {} };

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
      const status = !anyData ? 'MISSING' : isRef ? 'REF' : allScore && allEq && eqKnown ? 'PASS' : allScore && allEq && !eqKnown ? 'MISSING' : 'FAIL';
      add({ dimension: 'semantic', route, name: 'expected roles + role tree vs A', status, threshold: '100% roles, tree == A',
        value: { score: Object.fromEntries(VPS.map((w) => [w, per[w]?.score ?? null])), treeEqualA: isRef ? null : Object.fromEntries(VPS.map((w) => [w, per[w]?.treeEqualA ?? null])), detail: per } });
    }

    // responsive
    if (D.resp) for (const route of SWEEP_ROUTES) {
      const rr = D.resp.routes?.[route];
      if (!rr) { add({ dimension: 'responsive', route, name: 'sweep', status: 'MISSING', value: null, threshold: 'matches A' }); continue; }
      const widths = D.resp.widths || Object.keys(rr).map(Number);
      const overflow = [], colMis = [], padMis = [], errors = [];
      for (const w of widths) {
        const s = rr[w];
        if (!s || s.error) { errors.push(w); continue; }
        if (s.overflowX) overflow.push(w);
        const a = A?.resp?.routes?.[route]?.[w];
        if (a && !a.error && !isRef) {
          for (const k of Object.keys(a.columns || {})) if (a.columns[k] !== s.columns?.[k]) colMis.push({ w, section: k, A: a.columns[k], arm: s.columns?.[k] ?? null });
          const pa = (x) => parseFloat(x);
          if (Math.abs(pa(a.subject.paddingTop) - pa(s.subject.paddingTop)) > tol) padMis.push({ w, section: 'subject', A: a.subject.paddingTop, arm: s.subject.paddingTop });
          for (const k of Object.keys(a.sections || {})) {
            const bs = s.sections?.[k];
            if (!bs || Math.abs(pa(a.sections[k].paddingTop) - pa(bs.paddingTop)) > tol) padMis.push({ w, section: k, A: a.sections[k].paddingTop, arm: bs?.paddingTop ?? null });
          }
        }
      }
      const refMissing = !A?.resp && !isRef;
      const ok = !overflow.length && !colMis.length && !padMis.length && !errors.length;
      add({ dimension: 'responsive', route, name: 'columns/padding == A, no overflow', threshold: 'all widths match A, no overflow',
        status: isRef ? 'REF' : refMissing ? 'MISSING' : ok ? 'PASS' : 'FAIL',
        value: { widthsChecked: widths.length, overflowAt: overflow, columnMismatches: colMis.slice(0, 20), paddingMismatches: padMis.slice(0, 20), errors } });
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
      if (isC) {
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
        add({ dimension: 'tokens', route, name: 'boundShare @1440', threshold: isC ? '100%' : 'n/a', status: isC ? (p.boundShare === 1 ? 'PASS' : 'FAIL') : 'INFO', level: isC ? 'required' : 'info',
          value: { boundShare: p.boundShare, var: p.var, literal: p.literal } });
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
        add({ dimension: 'determinism', route: '-', name: 'pnpm generate:verify exit code', threshold: 'exit 0', status: D.det.generateVerify?.exitCode === 0 ? 'PASS' : 'FAIL', value: `exit ${D.det.generateVerify?.exitCode}` });
        const f = D.det.frozen;
        add({ dimension: 'determinism', route: '-', name: 'generated/ hashes == FROZEN.md', threshold: 'all equal', status: !f ? 'MISSING' : f.missing ? 'FAIL' : f.allMatch ? 'PASS' : 'FAIL',
          value: f ? { files: D.det.generated?.fileCount, frozenEntries: f.frozenEntries, matched: f.matched, mismatched: f.mismatched, notInFrozen: f.notInFrozen?.slice?.(0, 10), frozenNotOnDisk: f.frozenNotOnDisk?.slice?.(0, 10), aggregateFound: f.aggregateFound, missingFile: f.missing } : null });
        const br = D.det.bundleReproducibility;
        add({ dimension: 'determinism', route: '-', name: 'bundle reproducibility (two builds, reported separately)', threshold: 'identical dist hashes (info)', level: 'info', status: br?.identical ? 'PASS' : br?.buildDir ? 'FAIL' : 'MISSING',
          value: br ? { exitCodes: br.exitCodes, fileCounts: br.fileCounts, differingFiles: br.differingFiles?.slice(0, 20) } : null });
      } else add({ dimension: 'determinism', route: '-', name: 'determinism', threshold: 'exit 0', status: 'MISSING', value: 'step not run' });
      if (D.lic) {
        const l = D.lic.licenceLines, fb = D.lic.forbiddenStrings;
        add({ dimension: 'licence', route: '-', name: 'matching lines >= 40 chars vs Arm A source (supplementary, not proof)', threshold: '0', status: l.matchCount === 0 ? 'PASS' : 'FAIL',
          value: { matchCount: l.matchCount, uniqueHashes: l.uniqueMatchingHashes, scannedLines: l.scannedLines, referenceLines: l.referenceLines, locations: l.matches?.slice(0, 20).map((m) => `${m.file}:${m.line} ${m.sha256.slice(0, 12)}`) } });
        add({ dimension: 'licence', route: '-', name: 'forbidden strings under experiment dir', threshold: '0 hits', status: fb.hitCount === 0 ? 'PASS' : 'FAIL', value: { hitCount: fb.hitCount, filesScanned: fb.filesScanned, hits: fb.hits?.slice(0, 20) } });
      } else add({ dimension: 'licence', route: '-', name: 'licence check', threshold: '0', status: 'MISSING', value: 'step not run (run after C is frozen: --licence)' });
    }

    const tally = (lvl) => {
      const rows = checks.filter((c) => c.level === lvl);
      const count = (s) => rows.filter((c) => c.status === s).length;
      return { pass: count('PASS'), fail: count('FAIL'), missing: count('MISSING'), ref: count('REF'), total: rows.length };
    };
    out.arms[arm] = { reference: isRef, verdict: { required: tally('required'), stretch: tally('stretch'), info: tally('info') }, checks };
  }
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(runDir, 'summary.md'), renderMd(out));
  const tl = Object.entries(out.arms).map(([a, r]) => `${a}: ${r.reference ? 'reference' : `${r.verdict.required.pass} pass / ${r.verdict.required.fail} fail / ${r.verdict.required.missing} missing`}`).join('; ');
  console.log(`  wrote ${path.join(runDir, 'summary.json')} and summary.md  (${tl})`);
  return out;
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
  L.push(`Run: \`${s.label}\`  ·  generated ${s.generatedAt}  ·  reference arm A ${s.referencePresent ? 'present' : '**absent** (comparisons marked MISSING)'}`, '');
  L.push('## Verdict (required checks)', '', '| Arm | PASS | FAIL | MISSING | stretch PASS/FAIL |', '|---|---|---|---|---|');
  for (const [a, r] of Object.entries(s.arms)) {
    if (r.reference) L.push(`| ${a} | reference | | | |`);
    else L.push(`| ${a} | ${r.verdict.required.pass} | ${r.verdict.required.fail} | ${r.verdict.required.missing} | ${r.verdict.stretch.pass}/${r.verdict.stretch.fail} |`);
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
      L.push(`| ${a} | ${c.route} | ${c.name}${lvl} | ${short(compactValue(d, c.value))} | ${c.threshold || ''} | **${c.status}** |`);
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
  const dir = process.argv.slice(2).filter((a) => a !== '--')[0];
  if (!dir) { console.error('usage: node summarise.mjs <run-dir>'); process.exit(2); }
  summarise(dir);
}
