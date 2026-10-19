// Fixtures and end-to-end assertions for `--dry-run`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, writeJson, readJson, hashTree, sha256 } from './util.mjs';
import { ROUTES, VIEWPORTS, SWEEP_ROUTES, sweepWidths, loadDsc, getDscRel, setDscRel, defaultDscRel, bpForWidth, loadJson, INPUTS_DIR, HARNESS_DIR, EXP_DIR } from './config.mjs';
import { compareFrozen, compareFrozenRoot, parseFrozen, parseFrozenRevision, selectDeterminismInputs, dscArgOfScript } from './determinism.mjs';
import { aggregateTokens } from './measure.mjs';
import { isZeroLength, expandAxes } from './tokenrules.mjs';
import { referenceAnomalies } from '../summarise.mjs';
import { forbiddenStringScan } from './licence.mjs';

const round2 = (n) => Math.round(n * 10000) / 10000;
const IMPORT_PLANT = "import { somethingShared } from '../lib/some-long-module-path-name-x';";
const PLANT = "const syntheticSharedLineForSelfTest = 'zzz-unique-marker-12345-abcdef';";

/** DSC files present under ../inputs/dsc as [{tag:'r1', rel, revision}] in generation order. */
function dscGenerations() {
  return ['r1', 'r2', 'r3'].map((tag) => ({ tag, rel: `dsc/fs.ds.relume-default.${tag}.json` }))
    .filter((g) => fs.existsSync(path.join(INPUTS_DIR, g.rel))).map((g) => ({ ...g, revision: loadJson(path.join(INPUTS_DIR, g.rel)).revision }));
}

export function setupFixtures(outDir) {
  const root = ensureDir(path.join(outDir, '_fixtures'));
  const armC = ensureDir(path.join(root, 'arm-c'));
  const relumeSrc = ensureDir(path.join(root, 'relume-src', 'sections'));
  fs.writeFileSync(path.join(relumeSrc, 'Fake.tsx'), `// fixture\n${IMPORT_PLANT}\n${PLANT}\nexport const shortOne = 1;\nexport const aDifferentLongLineThatIsOnlyInTheReference = 'reference-only';\n`);
  ensureDir(path.join(armC, 'scripts'));
  ensureDir(path.join(armC, 'generator'));
  ensureDir(path.join(armC, 'app', 'src', 'generated'));
  // DSC generations present under ../inputs/dsc (the fixture mirrors the real arm-c layout: one FROZEN file and one verify script per generation)
  const gens = dscGenerations();
  const active = gens.find((g) => g.rel === getDscRel()) || gens[gens.length - 1];
  fs.writeFileSync(path.join(armC, 'package.json'), JSON.stringify({
    name: 'fixture-arm-c', private: true, type: 'module',
    scripts: {
      'generate:verify': 'node scripts/verify.mjs default',
      ...Object.fromEntries(gens.filter((g) => g.tag !== 'r1').map((g) => [`generate:verify:${g.tag}`, `node scripts/verify.mjs ${g.tag} --dsc ${g.rel}`])),
      build: 'node scripts/build.mjs',
    },
  }, null, 2));
  fs.writeFileSync(path.join(armC, 'scripts', 'verify.mjs'), "console.log('verify ok ' + process.argv.slice(2).join(' '));\n");
  fs.writeFileSync(path.join(armC, 'scripts', 'build.mjs'),
    "import fs from 'node:fs';fs.mkdirSync('dist/assets',{recursive:true});fs.writeFileSync('dist/index.html','<html></html>');fs.writeFileSync('dist/assets/app.js','console.log(1);'.repeat(50));\n");
  fs.writeFileSync(path.join(armC, 'generator', 'gen.mjs'), `// generator fixture\n${IMPORT_PLANT}\n${PLANT}\nexport const nothingElseShared = 'this line is long enough but unique to arm c';\n`);
  fs.writeFileSync(path.join(armC, 'app', 'src', 'generated', 'tokens.css'), ':root{--fs-color:#000}\n');
  fs.writeFileSync(path.join(armC, 'app', 'src', 'generated', 'index.js'), "export const generated = true;\n");
  // manifest of declarations the DSC does not govern (matches the stub's literal geometry; the stub sheet is inline, so these match loosely)
  fs.writeFileSync(path.join(armC, 'app', 'src', 'generated', 'generated-manifest.json'), JSON.stringify({ dsc: { id: 'fs.ds.relume-default', revision: active.revision, version: '0.1' }, ungoverned: [
    { file: 'components.css', property: 'padding', value: '12px 24px', reason: 'geometry', source: 'fixture' },
    { file: 'components.css', property: 'padding', value: '80px', reason: 'geometry', source: 'fixture' },
    { file: 'components.css', property: 'gap', value: '16px', reason: 'geometry', source: 'fixture' },
    { file: 'components.css', property: 'padding', value: '0px 5%', reason: 'geometry', source: 'fixture' },
    { file: 'components.css', property: 'padding', value: '0px', reason: 'geometry', source: 'fixture' },
    { file: 'components.css', property: 'border-width', value: '1px', reason: 'geometry', source: 'fixture' },
  ] }, null, 2));
  const hashesRel = {};
  for (const sub of ['app/src/generated', 'generator']) for (const [f, h] of Object.entries(hashTree(path.join(armC, sub)))) hashesRel[`${sub}/${f}`] = h;
  // One FROZEN file per generation. The one for the active generation (= the manifest's revision) carries the true hashes in the
  // FROZEN-r2.md layout (header lines incl. a "generated-manifest.json sha256:" line, then a fenced list); the others carry a stale hash for
  // the first entry, so comparing against the wrong file fails. The r1 file keeps the table layout.
  const stale = (h) => (h[0] === '0' ? '1' : '0') + h.slice(1);
  const fencedList = (hashes) => Object.entries(hashes).map(([f, h]) => `${h} ${f}`).join('\n');
  const frozenText = (g, hashes) => g.tag === 'r1'
    ? `# FROZEN\n\n- DSC revision: ${g.revision}\n\n| file | sha256 |\n|---|---|\n` + Object.entries(hashes).map(([f, h]) => `| \`${f}\` | ${h} |`).join('\n') + '\n'
    : `# FROZEN (${g.tag}): fixture\n\n- DSC id: fs.ds.relume-default\n- DSC revision: ${g.revision}\n- generated-manifest.json sha256: ${sha256('manifest-' + g.tag)}\n\n## sha256 of every file\n\n\`\`\`\n${fencedList(hashes)}\n\`\`\`\n`;
  for (const g of gens) {
    const hashes = { ...hashesRel };
    if (g !== active) { const k = Object.keys(hashes)[0]; hashes[k] = stale(hashes[k]); }
    fs.writeFileSync(path.join(armC, g.tag === 'r1' ? 'FROZEN.md' : `FROZEN-${g.tag}.md`), frozenText(g, hashes));
  }
  const serveArm = ensureDir(path.join(root, 'serve-arm'));
  fs.writeFileSync(path.join(serveArm, 'package.json'), JSON.stringify({ name: 'fixture-serve', private: true, scripts: { serve: 'node serve.mjs' } }));
  fs.writeFileSync(path.join(serveArm, 'serve.mjs'), "import http from 'node:http';http.createServer((q,r)=>r.end('ok')).listen(4396,'127.0.0.1');\n");
  const cleanRoot = ensureDir(path.join(root, 'clean-exp'));
  fs.writeFileSync(path.join(cleanRoot, 'a.txt'), 'nothing to see here\n');
  return { active, gens, root, serveArm, armC, armARoot: path.join(root, 'arm-a'), relumeSrc: path.join(root, 'relume-src'), cleanRoot, plant: PLANT };
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
      if (isC) add(`${id} governed boundShare 1.0 via manifest (raw < 1, exclusions counted, 0 uncovered)`, tok?.arm_level?.governed?.boundShareGoverned === 1 && tok.arm_level.governed.excludedByManifest > 0 && tok.arm_level.governed.uncoveredLiteralDecls === 0 && tok.arm_level.boundShare < 1, JSON.stringify(tok?.arm_level?.governed)?.slice(0, 300));
      const sp = J(id, 'responsive.json')?.routes?.layout620?.[1440]?.sectionPadding;
      add(`${id} r2 section padding measured on the nearest section (layout620)`, sp?.layout620?.tag === 'section' && /px$/.test(sp.layout620.paddingTop), JSON.stringify(sp));
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
      if (id === 'B') add('B stub differs from A: +3px height on /page@1440, mismatch > 0 on /layout620@1440', v?.routes?.page?.[1440]?.heightDiff === 3 && v?.routes?.layout620?.[1440]?.mismatchRatio > 0, JSON.stringify([v?.routes?.page?.[1440], v?.routes?.layout620?.[1440]]));
    }
  }
  if (fixtures?.serverSelfTest) {
    const t = fixtures.serverSelfTest;
    add('server lifecycle: started via pnpm, port up, stopped, port released, missing script refused', t.started && t.upWhileRunning && t.downAfterStop && t.missingScriptRefused, JSON.stringify(t));
  }
  if (fixtures?.stubRequests) {
    const rq = fixtures.stubRequests;
    if (rq.B) add('B received ?bp=tablet and ?bp=mobile, not on 1440', rq.B.some((u) => u.includes('?bp=tablet')) && rq.B.some((u) => u.includes('?bp=mobile')) && rq.B.some((u) => u === '/navbar'));
    if (rq.A) add('A never received ?bp=', !rq.A.some((u) => u.includes('bp=')));
    if (rq.C) add('C never received ?bp=', !rq.C.some((u) => u.includes('bp=')));
  }
  if (steps.includes('determinism') && armIds.includes('C')) {
    const d = J('C', 'determinism.json');
    const act = fixtures.active;
    const expFrozen = act.tag === 'r1' ? 'FROZEN.md' : `FROZEN-${act.tag}.md`;
    const expVerify = act.tag === 'r1' ? 'generate:verify' : `generate:verify:${act.tag}`;
    add('determinism: generate:verify exit 0', d?.generateVerify?.exitCode === 0, JSON.stringify(d?.generateVerify));
    add(`determinism (D-7): FROZEN file chosen by manifest dsc.revision (${expFrozen}, not FROZEN.md/older ones), recorded with manifestRevision and selectionBasis`,
      path.basename(d?.frozenFile || '') === expFrozen && d.manifestRevision === act.revision && typeof d.selectionBasis?.frozen === 'string' && d.selectionBasis.frozen.includes(expFrozen) && d.selection?.ok === true, JSON.stringify({ f: d?.frozenFile, r: d?.manifestRevision, b: d?.selectionBasis, s: d?.selection?.ok }));
    add(`determinism (D-7): verify script chosen by the --dsc revision (${expVerify}), recorded, and it is the one that ran`,
      d?.verifyScript === expVerify && d.generateVerify?.script === expVerify && fs.readFileSync(path.join(outDir, 'C', 'generate-verify.stdout.txt'), 'utf8').includes(`verify ok ${act.tag === 'r1' ? 'default' : act.tag}`), JSON.stringify({ v: d?.verifyScript, b: d?.selectionBasis?.verifyScript }));
    add('determinism (D-7): the older FROZEN files in the fixture carry a stale hash (so a wrong pick would fail)', fixtures.gens.length < 2 || fixtures.gens.filter((g) => g !== act).every((g) => { const t = fs.readFileSync(path.join(fixtures.armC, g.tag === 'r1' ? 'FROZEN.md' : `FROZEN-${g.tag}.md`), 'utf8'); return !compareFrozenRoot(Object.fromEntries(Object.entries(d.generated.hashes).map(([f, x]) => [`app/src/generated/${f}`, x])), t).allMatch; }));
    add('determinism (r2+): every root-relative entry of the selected FROZEN file matches disk; "generated-manifest.json sha256:" header hash lines are not entries', d?.frozenRoot?.allMatch === true && d.frozenRoot.frozenEntries === 4 && d.frozenRoot.matched === 4 && d.frozenRoot.headerHashLinesIgnored?.length === 2 && d.frozenRoot.headerHashLinesIgnored.some((l) => l.startsWith('- generated-manifest.json sha256:')) && path.basename(d.frozenRoot.file) === expFrozen, JSON.stringify(d?.frozenRoot));
    add('determinism (r1 legacy) reproduces the path-prefix artefact: generator entry reported not on disk', d?.frozen?.allMatch === false && d.frozen.frozenNotOnDisk?.length === 1, JSON.stringify(d?.frozen)?.slice(0, 200));
    add('determinism: two builds identical', d?.bundleReproducibility?.identical === true, JSON.stringify(d?.bundleReproducibility));
    // negative test of the pure comparison
    const text = fs.readFileSync(path.join(fixtures.armC, act.tag === 'r1' ? 'FROZEN.md' : `FROZEN-${act.tag}.md`), 'utf8');
    const tampered = { ...d.generated.hashes, 'index.js': sha256('tampered') };
    const tamperedRoot = { ...(() => { const h = {}; for (const [f, x] of Object.entries(d.generated.hashes)) h[`app/src/generated/${f}`] = x; return h; })(), 'generator/gen.mjs': sha256('x') };
    tamperedRoot['app/src/generated/index.js'] = sha256('tampered');
    const neg = compareFrozenRoot(tamperedRoot, text);
    add('determinism: tampered files are detected', neg.mismatched.length === 2 && !neg.allMatch, JSON.stringify(neg));
    add('determinism: FROZEN parser finds entries (table layout of the r1 file too)', parseFrozen(text).entries.length === 4 && parseFrozen(fs.readFileSync(path.join(fixtures.armC, 'FROZEN.md'), 'utf8')).entries.length === 4);
    const tR = fs.readFileSync(path.join(fixtures.armC, expFrozen), 'utf8');
    const pf = parseFrozen(tR);
    add('determinism: fenced FROZEN layout: 4 entries, header hash line reported separately', pf.entries.length === 4 && pf.fencedOnly && pf.headerHashLines.length === 2 && pf.headerHashLines.some((l) => l.startsWith('- generated-manifest.json sha256:')), JSON.stringify({ e: pf.entries.length, h: pf.headerHashLines }));
    add('determinism: DSC revision header parsed from FROZEN files', fixtures.gens.every((g) => parseFrozenRevision(fs.readFileSync(path.join(fixtures.armC, g.tag === 'r1' ? 'FROZEN.md' : `FROZEN-${g.tag}.md`), 'utf8')) === g.revision));
  }
  if (steps.includes('licence')) {
    const lic = fixtures.licenceResult;
    const file = J('C', 'licence.json');
    add('licence: planted non-import line matched once; planted import line reported separately', lic?.matchCountExclImports === 1 && lic.importLineMatchCount === 1 && lic.matchCount === 2, JSON.stringify({ m: lic?.matchCount, x: lic?.matchCountExclImports, i: lic?.importLineMatchCount }));
    add('licence: output has hashes only, never the line', !fs.readFileSync(path.join(outDir, 'C', 'licence.json'), 'utf8').includes('zzz-unique-marker'));
    add('licence: forbidden-string scan clean on clean root', file?.forbiddenStrings?.hitCount === 0);
    const planted = fs.mkdtempSync(path.join(os.tmpdir(), 'pc03b-planted-'));
    try {
      fs.writeFileSync(path.join(planted, 'x.js'), ['import x from "', ['relume', '-icons'].join(''), '";'].join(''));
      const f = forbiddenStringScan(planted);
      add('licence: forbidden-string scan detects a planted string', f.hitCount === 1 && f.hits[0].patternIndex === 0, JSON.stringify(f));
    } finally { fs.rmSync(planted, { recursive: true, force: true }); }
  }
  // unit checks of the r2 refinements
  {
    const mk = (prop, value, sheet) => ({ key: `${sheet}|${prop}|${value}`, sheet, selector: '.x', prop, value, cls: 'literal', mixed: false, shorthand: false });
    const v = (prop) => ({ key: `s|${prop}`, sheet: 's.css', selector: '.v', prop, value: 'var(--fs-a)', cls: 'var', mixed: false, shorthand: false });
    const man = { path: 'm', count: 1, entries: [{ file: 'components.css', property: 'padding', value: '12px', reason: 'geometry' }] };
    const r = aggregateTokens({ arm: { id: 'C', isC: true }, dsc: { tokens: { entries: [] } }, manifest: man,
      tokenPages: { page: { 1440: { decls: [v('color'), v('gap'), mk('padding', '12px', '/assets/components.css'), mk('padding', '12px', '/assets/other.css'), mk('gap', '3px', '/assets/components.css')], unreadable: [], fsVars: {}, inlineStyleElements: 0 } } } });
    const g = r.arm_level.governed;
    add('tokens (r2): manifest matches by file basename+property+value; uncovered literals are the real failures',
      g.excludedStrict === 1 && g.excludedLoose === 1 && g.uncoveredLiteralDecls === 1 && g.uncoveredLiterals[0].prop === 'gap' && g.boundShareGoverned === 0.6667 && r.arm_level.boundShare === 0.4, JSON.stringify(g));
    // r3 (D-6) accounting
    {
      const g = r.arm_level.governed, g2 = r.arm_level.governedR2;
      add('tokens (r3 data): `governed` carries rule r3 + coverage counts; `governedR2` keeps the r2 numbers',
        g.rule === 'r3' && g.coverage.strict === 1 && g.coverage.loose === 1 && g.coverage.viaShorthand === 0 && g.coverage.uncovered === 1 && g2.rule === 'r2' && g2.uncoveredLiteralDecls === 1 && r.arm_level.rawLiterals.length === 3 && r.manifestEntries.length === 1, JSON.stringify({ g: g.coverage, g2: g2.rule }));
    }
    {
      const lit = (prop, value, sheet) => ({ key: `${sheet}|${prop}|${value}`, sheet, selector: '.x', prop, value, cls: 'literal', mixed: false, shorthand: false });
      const B = '/assets/Button.css', C = '/assets/Card.css', H = '/assets/index-HASH.css';
      const decls = [
        lit('padding-left', '24px', B), lit('padding-right', '24px', B), lit('padding', '0px 24px', B), lit('padding', '0px', B), lit('padding-top', '0px', B),
        lit('padding-bottom', '24px', B), lit('padding', '12px 24px', B),
        lit('row-gap', '16px', C), lit('column-gap', '16px', C), lit('border-top-left-radius', '8px', C), lit('border-radius', '8px 0px', C), lit('gap', '16px', C), lit('gap', '16px 4px', C),
        lit('border-radius', '0', C), lit('padding-top', '0rem', C), lit('padding', '0%', C), lit('padding', '-0px', C), lit('padding', '0em 0px', C),
        lit('padding-top', '12px', H), lit('gap', '16px', H), lit('padding-left', '1.5rem', H), lit('font-size', '13px', H),
      ];
      const man3 = { path: 'm', count: 4, entries: [
        { file: 'Button.css', property: 'padding-inline', value: '24px', reason: 'geometry' }, { file: 'Card.css', property: 'gap', value: '16px', reason: 'geometry' },
        { file: 'Card.css', property: 'border-radius', value: '8px', reason: 'geometry' }, { file: 'components.css', property: 'padding-block', value: '12px', reason: 'geometry' } ] };
      const r3 = aggregateTokens({ arm: { id: 'C', isC: true }, dsc: { tokens: { entries: [] } }, manifest: man3,
        tokenPages: { page: { 1440: { decls: [{ key: 'v', sheet: B, selector: '.v', prop: 'color', value: 'var(--fs-a)', cls: 'var', mixed: false, shorthand: false }, ...decls], unreadable: [], fsVars: {}, inlineStyleElements: 0 } } } });
      const g = r3.arm_level.governed, g2 = r3.arm_level.governedR2;
      add('tokens (r3): zero lengths 0/0px/0rem/0em/0%/-0px and all-zero multi-values are neutral (7 of 22)', g.zeroLengthNeutral === 7, JSON.stringify(g.coverage) + ' zero=' + g.zeroLengthNeutral);
      add('tokens (r3): longhand<->shorthand coverage (padding-left/right<-padding-inline, row/column-gap<-gap, border-*-radius<->border-radius, padding 0 24px, rem normalised) counted as viaShorthand',
        g.coverage.strict === 1 && g.coverage.loose === 1 && g.coverage.viaShorthand === 9 && g.coverage.uncovered === 4 && g.viaShorthandScope.strict === 7 && g.viaShorthandScope.loose === 2, JSON.stringify([g.coverage, g.viaShorthandScope]));
      add('tokens (r3): a longhand is not covered by an entry of another file or another axis (padding-bottom vs padding-inline, padding 12px 24px, gap 16px 4px, font-size)',
        JSON.stringify(g.uncoveredLiterals.map((x) => `${x.prop}:${x.value}`).sort()) === JSON.stringify(['font-size:13px', 'gap:16px 4px', 'padding-bottom:24px', 'padding:12px 24px']), JSON.stringify(g.uncoveredLiterals));
      add('tokens (r3): governed share = var/(var+uncovered) and per-page share use the r3 rule; r2 rule kept alongside (`0px` literal, no shorthand mapping)',
        g.boundShareGoverned === 0.2 && r3.perPage.page[1440].boundShareGoverned === 0.2 && g2.rule === 'r2' && g2.excludedStrict + g2.excludedLoose === 2 && g2.uncoveredLiteralDecls === 20 && r3.perPage.page[1440].boundShareGovernedR2 === round2(1 / 21), JSON.stringify([g.boundShareGoverned, g2.uncoveredLiteralDecls]));
      add('tokens (r3): helpers - isZeroLength / expandAxes', ['0', '0px', '0rem', '0em', '0%', '-0px', '0 0', '0px 0 0em'].every(isZeroLength) && !['1px', '0 1px', 'var(--a)', '0s x'].some(isZeroLength)
        && expandAxes('padding', '1px 2px 3px').map((a) => a.axis + a.raw).join() === 'pt1px,pr2px,pb3px,pl2px' && expandAxes('padding-inline', 'var(--x)') === null && expandAxes('border-radius', '1px / 2px') === null && expandAxes('color', 'red') === null);
    }
    const an = referenceAnomalies({ dom: { routes: { page: { 1440: { semantic: { score: 0.8, missing: [{ role: 'nav' }], h1Count: 2 } } } } }, a11y: { routes: { navbar: { 375: { violations: [{ id: 'x', impact: 'serious', nodeCount: 2 }] } } } } });
    add('summary: A reference anomalies lists semantic<1 and axe serious/critical', an.semantic.length === 1 && an.axe.length === 1, JSON.stringify(an));
    const md = fs.existsSync(path.join(outDir, 'summary.md')) ? fs.readFileSync(path.join(outDir, 'summary.md'), 'utf8') : '';
    add('summary.md (r3 default) has the A reference anomalies section, the criteria label and the determinism inputs line (FROZEN file + verify script)',
      md.includes('## A reference anomalies') && md.includes('Criteria: **r3**') && (!armIds.includes('C') || !steps.includes('determinism') || (md.includes('Determinism inputs: FROZEN file **FROZEN') && md.includes('verify script **generate:verify') && md.includes('Token accounting (C): rule r3'))));
    const s2d = J('summary-r2.json');
    add('--criteria r2 summary still produced (r2 rule: governed block of the r2 accounting)', s2d?.criteria === 'r2' && (!armIds.includes('C') || !steps.includes('pages') || s2d.arms.C.checks.some((c) => c.dimension === 'tokens' && c.name.startsWith('boundShare over DSC-governed') && c.value?.rule === 'r2')));
    const s1 = J('summary-r1.json');
    add('--criteria r1 summary still produced (legacy semantics: role tree row required)', s1?.criteria === 'r1' && armIds.filter((a) => a !== 'A').every((a) => s1.arms[a]?.checks.some((c) => c.dimension === 'semantic' && c.name === 'expected roles + role tree vs A')));
    const s2 = J('summary.json');
    add('r3 summary: role tree is informational (r2 refinement kept)', armIds.filter((a) => a !== 'A').every((a) => s2.arms[a]?.checks.some((c) => c.dimension === 'semantic' && c.level === 'info')));
  }
  selectorAndDscChecks({ add, fixtures, outDir, steps, armIds, J });
  add('summary.json and summary.md written', fs.existsSync(path.join(outDir, 'summary.json')) && fs.existsSync(path.join(outDir, 'summary.md')));
  const sum = J('summary.json');
  add('summary.json covers every arm run', armIds.every((a) => sum?.arms?.[a]), Object.keys(sum?.arms || {}).join(','));
  return { checks, failed: checks.filter((c) => !c.ok).length, passed: checks.filter((c) => c.ok).length };
}

// ---------- D-7 selector, --dsc, sweep widths ----------
function selectorAndDscChecks({ add, fixtures, outDir, steps, armIds, J }) {
  const gens = dscGenerations();
  const byTag = Object.fromEntries(gens.map((g) => [g.tag, g]));
  const R = (tag) => byTag[tag]?.revision;
  // temporary arm-c trees: manifest revision + FROZEN files + package.json scripts
  const mk = (name, { manifestRev, frozen = {}, scripts = {}, noManifest = false }) => {
    const d = ensureDir(path.join(fixtures.root, `selector-${name}`));
    if (!noManifest) { ensureDir(path.join(d, 'app', 'src', 'generated')); fs.writeFileSync(path.join(d, 'app', 'src', 'generated', 'generated-manifest.json'), JSON.stringify({ dsc: { id: 'x', revision: manifestRev } })); }
    for (const [f, rev] of Object.entries(frozen)) fs.writeFileSync(path.join(d, f), `# FROZEN\n\n- DSC id: x\n- DSC revision: ${rev}\n\n\`\`\`\n${sha256(f)} app/src/generated/a.txt\n\`\`\`\n`);
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'x', scripts }));
    return d;
  };
  const dscArg = (tag) => `--dsc dsc/fs.ds.relume-default.${tag}.json`;
  if (byTag.r1 && byTag.r2) {
    const sc = { 'generate:verify': 'tsx g.ts --verify', 'generate:verify:r2': `tsx g.ts --verify ${dscArg('r2')}`, build: 'x' };
    const fr = { 'FROZEN.md': R('r1'), 'FROZEN-r2.md': R('r2') };
    const a = selectDeterminismInputs({ armCDir: mk('r2', { manifestRev: R('r2'), frozen: fr, scripts: sc }) });
    add('selector: manifest revision r2 -> FROZEN-r2.md and generate:verify:r2', path.basename(a.frozenFile) === 'FROZEN-r2.md' && a.verifyScript === 'generate:verify:r2' && a.selectionOk && a.manifestRevision === R('r2'), JSON.stringify(a));
    const b = selectDeterminismInputs({ armCDir: mk('r1', { manifestRev: R('r1'), frozen: fr, scripts: sc }) });
    add('selector: manifest revision r1 -> FROZEN.md and the bare generate:verify (no --dsc script verifies r1; warned)', path.basename(b.frozenFile) === 'FROZEN.md' && b.verifyScript === 'generate:verify' && b.warnings.length > 0 && /fallback/.test(b.selectionBasis.verifyScript), JSON.stringify(b));
  }
  if (byTag.r1 && byTag.r2 && byTag.r3) {
    const sc = { 'generate:verify': 'a', 'generate:verify:r2': `a ${dscArg('r2')}`, 'generate:verify:r3': `a --dsc=dsc/fs.ds.relume-default.r3.json` };
    const c = selectDeterminismInputs({ armCDir: mk('r3', { manifestRev: R('r3'), frozen: { 'FROZEN.md': R('r1'), 'FROZEN-r2.md': R('r2'), 'FROZEN-r3.md': R('r3') }, scripts: sc }) });
    add('selector: manifest revision r3 -> FROZEN-r3.md and generate:verify:r3 (also with --dsc=path)', path.basename(c.frozenFile) === 'FROZEN-r3.md' && c.verifyScript === 'generate:verify:r3' && c.selectionOk, JSON.stringify(c));
  }
  {
    const d = selectDeterminismInputs({ armCDir: mk('bare', { manifestRev: R('r2') || 'sha256:' + '1'.repeat(64), frozen: { 'FROZEN.md': R('r2') || 'sha256:' + '1'.repeat(64) }, scripts: { 'generate:verify': 'tsx g.ts --verify' } }) });
    add('selector: no script carries --dsc -> fallback generate:verify', d.verifyScript === 'generate:verify' && /no generate:verify\* script carries --dsc/.test(d.selectionBasis.verifyScript) && d.selectionOk, JSON.stringify(d.selectionBasis));
    const e = selectDeterminismInputs({ armCDir: mk('nofile', { manifestRev: 'sha256:' + '2'.repeat(64), frozen: { 'FROZEN.md': 'sha256:' + '3'.repeat(64) }, scripts: {} }) });
    add('selector: no FROZEN file carries the manifest revision -> not selected (selectionOk false, frozenFile null)', e.frozenFile === null && e.selectionOk === false && /no FROZEN/.test(e.selectionBasis.frozen), JSON.stringify(e.selectionBasis));
    const f = selectDeterminismInputs({ armCDir: mk('nomanifest', { noManifest: true, frozen: { 'FROZEN.md': 'sha256:' + '3'.repeat(64) }, scripts: {} }) });
    add('selector: manifest unreadable -> not selected, warning recorded', f.selectionOk === false && f.manifestRevision === null && f.warnings.length > 0);
    const o = selectDeterminismInputs({ armCDir: mk('override', { manifestRev: 'sha256:' + '2'.repeat(64), frozen: { 'FROZEN.md': 'sha256:' + '3'.repeat(64) }, scripts: { 'generate:verify:x': 'a' } }), frozenOverride: 'FROZEN.md', verifyOverride: 'generate:verify:x' });
    add('selector: --frozen / --verify-script overrides win and are recorded as such (mismatch with the manifest warned)', path.basename(o.frozenFile) === 'FROZEN.md' && o.verifyScript === 'generate:verify:x' && /override/.test(o.selectionBasis.frozen) && /override/.test(o.selectionBasis.verifyScript) && o.warnings.some((w) => /manifest says/.test(w)), JSON.stringify(o));
    add('selector: dscArgOfScript parses --dsc forms', dscArgOfScript('tsx g.ts --verify --dsc a/b.json') === 'a/b.json' && dscArgOfScript('x --dsc=a/b.json') === 'a/b.json' && dscArgOfScript('x --dsc "a b.json"') === 'a b.json' && dscArgOfScript('tsx g.ts --verify') === null);
  }
  {
    // the real arm-c headers (read-only): FROZEN.md is the r1 generation, FROZEN-r2.md the r2 generation
    const armC = path.join(EXP_DIR, 'arm-c');
    for (const [file, tag] of [['FROZEN.md', 'r1'], ['FROZEN-r2.md', 'r2']]) {
      if (!fs.existsSync(path.join(armC, file)) || !R(tag)) continue;
      add(`selector: real arm-c ${file} header parses to the ${tag} DSC revision`, parseFrozenRevision(fs.readFileSync(path.join(armC, file), 'utf8')) === R(tag));
    }
  }
  // --dsc / sweep widths / tiers
  {
    const rel = getDscRel();
    const run = J('run.json');
    const dsc = loadDsc();
    const w = sweepWidths(dsc);
    add('run.json records the DSC path, revision, screens/breakpoints and the sweep width list', run?.dsc === rel && run.dscRevision === dsc.revision && JSON.stringify(run.sweepWidths) === JSON.stringify(w) && JSON.stringify(run.browser?.sweepWidths) === JSON.stringify(w), JSON.stringify({ d: run?.dsc, r: run?.dscRevision }));
    if (steps.includes('responsive') && armIds[0]) {
      const resp = J(armIds[0], 'responsive.json');
      add('responsive.json records the same width list as run.json', JSON.stringify(resp?.widths) === JSON.stringify(w) && resp?.dsc === rel, JSON.stringify(resp?.widths));
    }
    const base = []; for (let x = 375; x <= 1440; x += 64) base.push(x);
    add('sweep widths: contains the whole 64px series + 1440, sorted unique, inside 375..1440', base.every((x) => w.includes(x)) && w.includes(1440) && w.every((x, i) => i === 0 || x > w[i - 1]) && w[0] >= 375 && w[w.length - 1] <= 1440, JSON.stringify(w));
    const mins = [...(dsc.screens || []), ...dsc.breakpoints].map((b) => b.minWidth);
    add('sweep widths: every screens[]/breakpoints[] minWidth and minWidth-1 inside 375..1440 is swept', mins.every((m) => [m, m - 1].every((x) => x < 375 || x > 1440 || w.includes(x))), JSON.stringify({ mins, w }));
    // r2 file and an r3-shaped copy (extra `screens`, lg 1024 -> 992) written under harness/.tmp, deleted afterwards
    const r2 = byTag.r2 ? loadJson(path.join(INPUTS_DIR, byTag.r2.rel)) : null;
    if (r2) {
      const w2 = sweepWidths(r2);
      const base64 = base.concat(1440);
      add('sweep widths (r2 DSC, no screens): 64px series + 767/768 + 1023/1024 only', JSON.stringify(w2) === JSON.stringify([...new Set([...base64, 767, 768, 1023, 1024])].sort((a, b) => a - b)), JSON.stringify(w2));
      const shaped = { ...r2, screens: [{ id: 'sm', minWidth: 480 }, { id: 'md', minWidth: 768 }, { id: 'lg', minWidth: 992 }, { id: 'xl', minWidth: 1280 }, { id: 'xxl', minWidth: 1440 }],
        breakpoints: r2.breakpoints.map((b) => (b.id === 'lg' ? { ...b, minWidth: 992 } : b)) };
      const tmpDir = ensureDir(path.join(HARNESS_DIR, '.tmp'));
      const tmpFile = path.join(tmpDir, `dry-run-r3shape-${process.pid}.json`);
      const prev = getDscRel();
      try {
        fs.writeFileSync(tmpFile, JSON.stringify(shaped));
        const relFromInputs = path.relative(INPUTS_DIR, tmpFile);
        setDscRel(relFromInputs);
        const loaded = loadDsc();
        const w3 = sweepWidths(loaded);
        const want = [...new Set([...base64, 479, 480, 767, 768, 991, 992, 1279, 1280, 1439, 1440])].sort((a, b) => a - b);
        add('--dsc <path relative to ../inputs> is honoured by loadDsc() (r3-shaped temporary file)', getDscRel() === relFromInputs && loaded.screens?.length === 5, relFromInputs);
        add('sweep widths (r3-shaped DSC): 64px series + 479/480 767/768 991/992 1279/1280 1439/1440 (screens and tiers)', JSON.stringify(w3) === JSON.stringify(want), JSON.stringify(w3));
        add('bpForWidth follows the DSC tiers (breakpoints), not screens: r3 shape 991 tablet, 992 desktop, 480 mobile, 767 mobile; r2 1023 tablet, 1024 desktop',
          bpForWidth(991, loaded) === 'tablet' && bpForWidth(992, loaded) === 'desktop' && bpForWidth(480, loaded) === 'mobile' && bpForWidth(767, loaded) === 'mobile' && bpForWidth(1023, r2) === 'tablet' && bpForWidth(1024, r2) === 'desktop');
        let threw = false; try { setDscRel('dsc/does-not-exist.json'); } catch { threw = true; }
        add('--dsc with a missing file is refused', threw && getDscRel() === relFromInputs);
      } finally {
        fs.rmSync(tmpFile, { force: true });
        try { fs.rmdirSync(tmpDir); } catch { /* not empty: other scratch files */ }
        setDscRel(prev);
      }
      add('temporary r3-shaped DSC file was deleted', !fs.existsSync(tmpFile));
    }
    add('default DSC is r3 when that file exists, else r2', defaultDscRel() === (byTag.r3 ? byTag.r3.rel : byTag.r2?.rel ?? defaultDscRel()));
  }
}
