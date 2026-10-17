// Fixtures and end-to-end assertions for `--dry-run`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, writeJson, readJson, hashTree, sha256 } from './util.mjs';
import { ROUTES, VIEWPORTS, SWEEP_ROUTES, sweepWidths } from './config.mjs';
import { compareFrozen, parseFrozen } from './determinism.mjs';
import { forbiddenStringScan } from './licence.mjs';

const PLANT = "const syntheticSharedLineForSelfTest = 'zzz-unique-marker-12345-abcdef';";

export function setupFixtures(outDir) {
  const root = ensureDir(path.join(outDir, '_fixtures'));
  const armC = ensureDir(path.join(root, 'arm-c'));
  const relumeSrc = ensureDir(path.join(root, 'relume-src', 'sections'));
  fs.writeFileSync(path.join(relumeSrc, 'Fake.tsx'), `// fixture\n${PLANT}\nexport const shortOne = 1;\nexport const aDifferentLongLineThatIsOnlyInTheReference = 'reference-only';\n`);
  ensureDir(path.join(armC, 'scripts'));
  ensureDir(path.join(armC, 'generator'));
  ensureDir(path.join(armC, 'app', 'src', 'generated'));
  fs.writeFileSync(path.join(armC, 'package.json'), JSON.stringify({
    name: 'fixture-arm-c', private: true, type: 'module',
    scripts: { 'generate:verify': 'node scripts/verify.mjs', build: 'node scripts/build.mjs' },
  }, null, 2));
  fs.writeFileSync(path.join(armC, 'scripts', 'verify.mjs'), "console.log('verify ok');\n");
  fs.writeFileSync(path.join(armC, 'scripts', 'build.mjs'),
    "import fs from 'node:fs';fs.mkdirSync('dist/assets',{recursive:true});fs.writeFileSync('dist/index.html','<html></html>');fs.writeFileSync('dist/assets/app.js','console.log(1);'.repeat(50));\n");
  fs.writeFileSync(path.join(armC, 'generator', 'gen.mjs'), `// generator fixture\n${PLANT}\nexport const nothingElseShared = 'this line is long enough but unique to arm c';\n`);
  fs.writeFileSync(path.join(armC, 'app', 'src', 'generated', 'tokens.css'), ':root{--fs-color:#000}\n');
  fs.writeFileSync(path.join(armC, 'app', 'src', 'generated', 'index.js'), "export const generated = true;\n");
  const gen = hashTree(path.join(armC, 'app', 'src', 'generated'));
  fs.writeFileSync(path.join(armC, 'FROZEN.md'), '# FROZEN\n\n| file | sha256 |\n|---|---|\n' + Object.entries(gen).map(([f, h]) => `| \`app/src/generated/${f}\` | ${h} |`).join('\n') + '\n');
  const cleanRoot = ensureDir(path.join(root, 'clean-exp'));
  fs.writeFileSync(path.join(cleanRoot, 'a.txt'), 'nothing to see here\n');
  return { root, armC, armARoot: path.join(root, 'arm-a'), relumeSrc: path.join(root, 'relume-src'), cleanRoot, plant: PLANT };
}

export function assertDryRun({ outDir, armIds, fixtures, steps }) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: ok ? '' : String(detail).slice(0, 400) });
  const J = (...p) => readJson(path.join(outDir, ...p));
  const full = steps.includes('pages') && steps.includes('responsive') && steps.includes('scroll');

  for (const id of armIds) {
    const dir = path.join(outDir, id);
    if (steps.includes('pages')) {
      for (const f of ['dom-roles.json', 'geometry.json', 'accessibility.json', 'page-meta.json', 'token-integrity.json']) add(`${id}/${f} written`, fs.existsSync(path.join(dir, f)));
      const pngs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')) : [];
      add(`${id} has ${ROUTES.length * VIEWPORTS.length} screenshots`, pngs.length === ROUTES.length * VIEWPORTS.length, `found ${pngs.length}`);
      const meta = J(id, 'page-meta.json');
      let allFonts = true, anyExternal = false, anyErr = false;
      for (const r of Object.values(meta?.routes || {})) for (const m of Object.values(r)) {
        if (!m.fonts?.source_sans_3_loaded) allFonts = false;
        if (m.externalRequests?.length) anyExternal = true;
        if (m.gotoError || m.status !== 200) anyErr = true;
      }
      add(`${id} Source Sans 3 loaded on every page`, allFonts);
      add(`${id} no external requests, all HTTP 200`, !anyExternal && !anyErr);
      const dom = J(id, 'dom-roles.json');
      let semOk = true; const bad = [];
      for (const r of ROUTES) for (const vp of VIEWPORTS) {
        const s = dom?.routes?.[r]?.[vp.width]?.semantic;
        if (!s || s.score !== 1) { semOk = false; bad.push(`${r}@${vp.width}:${s?.score}`); }
      }
      add(`${id} semantic score 1.0 on every route/viewport`, semOk, bad.join(','));
      const page = dom?.routes?.page?.[1440];
      add(`${id} /page has exactly one h1`, page?.semantic?.h1Count === 1, JSON.stringify(page?.semantic?.h1Count));
      const geo = J(id, 'geometry.json');
      const fsIdCount = geo?.routes?.page?.[1440]?.fsIds?.length;
      const isC = id === 'C' || id === 'Cssr';
      add(`${id} data-fs-id presence matches arm type`, isC ? fsIdCount > 0 : fsIdCount === 0, `fsIds=${fsIdCount}`);
      const l1440 = geo?.routes?.layout620?.[1440]?.columns?.layout620?.columns;
      const l375 = geo?.routes?.layout620?.[375]?.columns?.layout620?.columns;
      add(`${id} layout620 columns 3 @1440 and 1 @375`, l1440 === 3 && l375 === 1, `${l1440}/${l375}`);
      const t1440 = geo?.routes?.testimonial37?.[1440]?.columns?.testimonial37?.columns;
      const t375 = geo?.routes?.testimonial37?.[375]?.columns?.testimonial37?.columns;
      add(`${id} testimonial37 columns 3 @1440 and 1 @375`, t1440 === 3 && t375 === 1, `${t1440}/${t375}`);
      const ax = J(id, 'accessibility.json');
      const ax1 = ax?.routes?.navbar?.[1440];
      add(`${id} axe ran and keyboard sequence recorded (navbar)`, ax1?.byImpact && ax1?.tabSequence?.length > 0, JSON.stringify(ax1)?.slice(0, 200));
      add(`${id} focus-visible indicator recorded on first button`, ax?.routes?.cta25?.[1440]?.focusVisible?.found === true && ax.routes.cta25[1440].focusVisible.indicatorVisible === true, JSON.stringify(ax?.routes?.cta25?.[1440]?.focusVisible));
      const tok = J(id, 'token-integrity.json');
      add(`${id} token declarations classified`, tok?.arm_level?.varDecls + tok?.arm_level?.literalDecls > 0, JSON.stringify(tok?.arm_level)?.slice(0, 200));
      if (isC) add(`${id} DSC tokens resolved with 0 mismatches`, tok?.tokens?.mismatchCount === 0 && tok?.tokens?.missingCount === 0 && tok.tokens.ok === tok.tokens.tokenCount, JSON.stringify({ ...tok?.tokens, resolvedNames: undefined, extraFsVars: undefined }).slice(0, 300));
      if (id === 'A') add('A boundShare is 0 (no tokens)', tok?.arm_level?.varDecls === 0);
      if (isC) add(`${id} has var() declarations`, tok?.arm_level?.varDecls > 0);
    }
    if (steps.includes('responsive')) {
      const rs = J(id, 'responsive.json');
      let n = 0, errs = 0, overflow = 0;
      for (const r of SWEEP_ROUTES) for (const w of sweepWidths()) {
        const s = rs?.routes?.[r]?.[w];
        n++;
        if (!s || s.error) errs++;
        else if (s.overflowX) overflow++;
      }
      add(`${id} responsive sweep complete (${SWEEP_ROUTES.length}x${sweepWidths().length} samples)`, n === SWEEP_ROUTES.length * sweepWidths().length && errs === 0, `errs=${errs}`);
      add(`${id} no horizontal overflow in sweep`, overflow === 0, `overflow=${overflow}`);
      const st = rs?.routes?.header80?.[1440]?.stage;
      add(`${id} header80 stage recorded in sweep`, st && (id === 'B' || id === 'Bp' ? st.found === false : st.found && st.fillsViewport), JSON.stringify(st));
    }
    if (steps.includes('scroll')) {
      const sp = J(id, 'scroll-probe.json');
      const v = sp?.viewports?.[1440];
      add(`${id} scroll probe: 5 samples + reduced-motion record`, v?.samples?.length === 5 && v?.reducedMotion?.identity !== undefined, JSON.stringify(v)?.slice(0, 200));
      if (id === 'B' || id === 'Bp') add(`${id} static columns recorded as no transform`, v?.hasMotionElements && v?.hasTransform === false);
      else {
        const L = v?.samples?.map((s) => s.left.translateYPct), R = v?.samples?.map((s) => s.right.translateYPct);
        const mono = L && R && L.every((x, i) => i === 0 || x < L[i - 1]) && R.every((x, i) => i === 0 || x > R[i - 1]);
        add(`${id} scroll probe: left decreases, right increases monotonically`, mono, `L=${L} R=${R}`);
        add(`${id} scroll probe: sticky stage top ~0 and height==innerHeight`, v.samples.every((s) => s.stage.found && Math.abs(s.stage.top) <= 1 && Math.abs(s.stage.height - s.stage.innerHeight) <= 1), JSON.stringify(v.samples.map((s) => s.stage)));
        add(`${id} reduced motion gives identity transform`, v.reducedMotion.identity === true && v.reducedMotion.mediaMatches === true, JSON.stringify(v.reducedMotion)?.slice(0, 200));
        add(`${id} scroll probe 375: section 150vh`, Math.abs(sp.viewports[375].samples[0].sectionHeight - 812 * 1.5) <= 2, sp.viewports[375].samples[0].sectionHeight);
      }
    }
  }
  if (steps.includes('visual') && armIds.includes('A')) {
    for (const id of armIds.filter((a) => a !== 'A')) {
      const v = J(id, 'visual.json');
      add(`${id} visual.json has comparisons vs A (21)`, v && Object.values(v.routes).reduce((n, r) => n + Object.values(r).filter((x) => x.ssim !== undefined).length, 0) === 21, JSON.stringify(v)?.slice(0, 200));
      const diffs = fs.existsSync(path.join(outDir, id, 'diff')) ? fs.readdirSync(path.join(outDir, id, 'diff')).length : 0;
      add(`${id} diff PNGs saved (21)`, diffs === 21, diffs);
      if (id === 'C' || id === 'Cssr') add(`${id} stub pixel-identical to A on /layout620@1440`, v?.routes?.layout620?.[1440]?.mismatchRatio === 0 && v.routes.layout620[1440].ssim === 1, JSON.stringify(v?.routes?.layout620?.[1440]));
      if (id === 'B') add('B stub differs from A: +1px height on /layout620@1440, mismatch > 0', v?.routes?.layout620?.[1440]?.heightDiff === 1 && v.routes.layout620[1440].mismatchRatio > 0, JSON.stringify(v?.routes?.layout620?.[1440]));
    }
  }
  if (fixtures?.stubRequests) {
    const rq = fixtures.stubRequests;
    if (rq.B) add('B received ?bp=tablet and ?bp=mobile, not on 1440', rq.B.some((u) => u.includes('?bp=tablet')) && rq.B.some((u) => u.includes('?bp=mobile')) && rq.B.some((u) => u === '/navbar'));
    if (rq.A) add('A never received ?bp=', !rq.A.some((u) => u.includes('bp=')));
    if (rq.C) add('C never received ?bp=', !rq.C.some((u) => u.includes('bp=')));
  }
  if (steps.includes('determinism') && armIds.includes('C')) {
    const d = J('C', 'determinism.json');
    add('determinism: generate:verify exit 0', d?.generateVerify?.exitCode === 0, JSON.stringify(d?.generateVerify));
    add('determinism: generated hashes match FROZEN.md', d?.frozen?.allMatch === true, JSON.stringify(d?.frozen));
    add('determinism: two builds identical', d?.bundleReproducibility?.identical === true, JSON.stringify(d?.bundleReproducibility));
    // negative test of the pure comparison
    const text = fs.readFileSync(path.join(fixtures.armC, 'FROZEN.md'), 'utf8');
    const tampered = { ...d.generated.hashes, 'index.js': sha256('tampered') };
    const neg = compareFrozen(tampered, text);
    add('determinism: tampered file is detected', neg.mismatched.length === 1 && !neg.allMatch);
    add('determinism: FROZEN.md parser finds entries', parseFrozen(text).entries.length === 2);
  }
  if (steps.includes('licence')) {
    const lic = fixtures.licenceResult;
    const file = J('C', 'licence.json');
    add('licence: exactly the planted line matched (1 C-side line)', lic?.matchCount === 1 && lic.uniqueMatchingHashes === 1, JSON.stringify({ m: lic?.matchCount, u: lic?.uniqueMatchingHashes }));
    add('licence: output has hashes only, never the line', !fs.readFileSync(path.join(outDir, 'C', 'licence.json'), 'utf8').includes('zzz-unique-marker'));
    add('licence: forbidden-string scan clean on clean root', file?.forbiddenStrings?.hitCount === 0);
    const planted = fs.mkdtempSync(path.join(os.tmpdir(), 'pc03b-planted-'));
    try {
      fs.writeFileSync(path.join(planted, 'x.js'), ['import x from "', ['relume', '-icons'].join(''), '";'].join(''));
      const f = forbiddenStringScan(planted);
      add('licence: forbidden-string scan detects a planted string', f.hitCount === 1 && f.hits[0].patternIndex === 0, JSON.stringify(f));
    } finally { fs.rmSync(planted, { recursive: true, force: true }); }
  }
  add('summary.json and summary.md written', fs.existsSync(path.join(outDir, 'summary.json')) && fs.existsSync(path.join(outDir, 'summary.md')));
  const sum = J('summary.json');
  add('summary.json covers every arm run', armIds.every((a) => sum?.arms?.[a]), Object.keys(sum?.arms || {}).join(','));
  return { checks, failed: checks.filter((c) => !c.ok).length, passed: checks.filter((c) => c.ok).length };
}
