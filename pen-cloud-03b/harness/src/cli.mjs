#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ARM_ORDER, EXP_DIR, ARM_A_ROOT, ROUTES, makeArms, loadDsc, BROWSER_CONTEXT, VIEWPORTS, sweepWidths } from './config.mjs';
import { ensureDir, writeJson, runCommand } from './util.mjs';
import { startArmServer, stopAllServers } from './servers.mjs';
import { launchBrowser, measurePages, measureResponsive, measureScrollProbe, aggregateTokens } from './measure.mjs';
import { runBuild } from './build.mjs';
import { runVisual } from './visual.mjs';
import { runDeterminism } from './determinism.mjs';
import { licenceCheck, forbiddenStringScan } from './licence.mjs';
import { summarise } from '../summarise.mjs';

const argv = process.argv.slice(2).filter((a) => a !== '--');
const { values: opt } = parseArgs({
  args: argv,
  options: {
    arms: { type: 'string' }, out: { type: 'string' }, label: { type: 'string' }, steps: { type: 'string' },
    'dry-run': { type: 'boolean', default: false }, licence: { type: 'boolean', default: false },
    'skip-build': { type: 'boolean', default: false }, 'no-summary': { type: 'boolean', default: false },
    routes: { type: 'string' }, help: { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

if (opt.help) {
  console.log(`usage: pnpm run harness -- --arms A,B,Bp,C,Cssr --out ../results/run-<label> [options]
  --steps a,b,c     subset of: build,pages,responsive,scroll,visual,determinism,licence
                    (default: all except licence; --licence adds it; licence needs C to be frozen)
  --skip-build      do not run pnpm build (servers must serve an existing build)
  --routes r1,r2    restrict the per-page measurements to these routes (debugging)
  --dry-run         validate the harness against built-in stub arms and fixtures, no real arm needed
  --no-summary      do not run summarise.mjs afterwards`);
  process.exit(0);
}

const DRY = opt['dry-run'];
const ALL_STEPS = ['build', 'pages', 'responsive', 'scroll', 'visual', 'determinism', 'licence'];
let steps = opt.steps ? opt.steps.split(',').map((s) => s.trim()).filter(Boolean) : ALL_STEPS.filter((s) => s !== 'licence');
if (opt.licence && !steps.includes('licence')) steps.push('licence');
for (const s of steps) if (!ALL_STEPS.includes(s)) { console.error(`unknown step ${s}`); process.exit(2); }
if (opt['skip-build']) steps = steps.filter((s) => s !== 'build');
const has = (s) => steps.includes(s);

const armIds = (opt.arms ? opt.arms.split(',').map((s) => s.trim()) : DRY ? ['A', 'B', 'Bp', 'C', 'Cssr'] : ARM_ORDER)
  .filter(Boolean);
for (const a of armIds) if (!ARM_ORDER.includes(a)) { console.error(`unknown arm ${a} (valid: ${ARM_ORDER.join(',')})`); process.exit(2); }
armIds.sort((a, b) => ARM_ORDER.indexOf(a) - ARM_ORDER.indexOf(b)); // A first so visual refs exist

const label = opt.label || new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(opt.out || (DRY ? path.join(path.dirname(new URL(import.meta.url).pathname), '..', '.dry-run-out') : path.join(EXP_DIR, 'results', `run-${label}`)));
if (DRY && fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
ensureDir(outDir);

const log = (...a) => console.log(...a);
const routes = opt.routes ? opt.routes.split(',') : ROUTES;

// ---------- dry-run scaffolding ----------
let fixtures = null;
let stubs = [];
let arms;
if (DRY) {
  const { setupFixtures } = await import('./dryrun.mjs');
  const { startStub } = await import('./stub.mjs');
  fixtures = setupFixtures(outDir);
  const ports = { A: 4391, B: 4392, Bp: 4393, C: 4394, Cssr: 4395 };
  arms = makeArms({ ports, armCDir: fixtures.armC, armARoot: fixtures.armARoot });
  const variants = { A: 'plain', B: 'static', Bp: 'static', C: 'fs', Cssr: 'fs' };
  for (const id of armIds) stubs.push(await startStub({ port: ports[id], variant: variants[id], name: id }));
} else {
  arms = makeArms();
}

const needServers = has('pages') || has('responsive') || has('scroll');
const run = {
  label, startedAt: new Date().toISOString(), dryRun: DRY, arms: armIds, steps, routes,
  node: process.version, cwd: process.cwd(),
  browser: { engine: 'chromium', context: BROWSER_CONTEXT, viewports: VIEWPORTS, sweepWidths: sweepWidths() },
  ports: Object.fromEntries(armIds.map((a) => [a, arms[a].port])),
};
const dsc = loadDsc();
run.dscRevision = dsc.revision;

let exitCode = 0;
const builtGroups = new Map();
let browser = null;
try {
  if (needServers) { browser = await launchBrowser(); run.browser.version = browser.version(); }
  for (const id of armIds) {
    const arm = arms[id];
    const dir = ensureDir(path.join(outDir, id));
    log(`\n=== Arm ${id} (port ${arm.port}) ===`);
    // 1. build verification
    if (has('build') && !DRY) {
      if (!builtGroups.has(arm.group)) {
        log(`  pnpm build (${arm.group})`);
        builtGroups.set(arm.group, await runBuild(arm, outDir));
        log(`  build exit ${builtGroups.get(arm.group).exitCode}`);
      }
      const b = builtGroups.get(arm.group);
      writeJson(path.join(dir, 'build.json'), arm.group === id ? b : { sharedWith: arm.group, ...b });
    } else if (has('build') && DRY) {
      writeJson(path.join(dir, 'build.json'), { ran: false, dryRun: true, note: 'build skipped in dry-run', exitCode: 0 });
    }
    if (!needServers) continue;
    // server
    let server;
    if (DRY) server = { ok: true, stop: async () => {} };
    else server = await startArmServer(arm, dir);
    if (!server.ok) {
      log(`  SERVER FAILED: ${server.error}`);
      writeJson(path.join(dir, 'error.json'), { stage: 'server', error: server.error, cmd: arm.serve });
      exitCode = 1;
      continue;
    }
    try {
      if (has('pages')) {
        const r = await measurePages({ browser, arm, outDir, routes, log });
        writeJson(path.join(dir, 'dom-roles.json'), { arm: id, routes: r.dom });
        writeJson(path.join(dir, 'geometry.json'), { arm: id, routes: r.geometry });
        writeJson(path.join(dir, 'accessibility.json'), { arm: id, routes: r.a11y });
        writeJson(path.join(dir, 'page-meta.json'), { arm: id, routes: r.meta });
        const tok = aggregateTokens({ arm, tokenPages: r.tokens, dsc });
        writeJson(path.join(dir, 'token-integrity.json'), tok);
      }
      if (has('responsive')) writeJson(path.join(dir, 'responsive.json'), { arm: id, widths: sweepWidths(), height: 900, routes: await measureResponsive({ browser, arm, log }) });
      if (has('scroll')) writeJson(path.join(dir, 'scroll-probe.json'), { arm: id, viewports: await measureScrollProbe({ browser, arm, log }) });
    } catch (e) {
      log(`  MEASUREMENT FAILED: ${e.stack || e}`);
      writeJson(path.join(dir, 'error.json'), { stage: 'measure', error: String(e.stack || e) });
      exitCode = 1;
    } finally {
      await server.stop();
    }
  }
  if (DRY) {
    for (const s of stubs) { run.stubRequests ||= {}; run.stubRequests[s.name] = s.requests.length; }
    fixtures.stubRequests = Object.fromEntries(stubs.map((s) => [s.name, s.requests]));
    for (const s of stubs) await s.stop();
  }

  // visual (post pass, needs A in the same out dir)
  if (has('visual')) {
    log('\n=== visual comparison vs A ===');
    const present = ARM_ORDER.filter((a) => fs.existsSync(path.join(outDir, a)));
    const v = runVisual(outDir, present, { log });
    if (v.skipped) { log(`  skipped: ${v.skipped}`); writeJson(path.join(outDir, 'visual-skipped.json'), v); }
    else for (const [a, r] of Object.entries(v)) writeJson(path.join(outDir, a, 'visual.json'), r);
  }

  // determinism (C only)
  if (has('determinism') && (armIds.includes('C') || armIds.includes('Cssr'))) {
    log('\n=== determinism (C) ===');
    const d = await runDeterminism({ armCDir: arms.C.buildDirs[0], outDir, armId: 'C', log });
    writeJson(path.join(outDir, 'C', 'determinism.json'), d);
  }

  // licence + forbidden strings
  if (has('licence')) {
    log('\n=== licence check ===');
    const relumeSrc = DRY ? fixtures.relumeSrc : path.join(ARM_A_ROOT, 'relume-src');
    const armCDir = arms.C.buildDirs[0];
    const lic = licenceCheck({ armCDir, relumeSrc });
    const forb = forbiddenStringScan(DRY ? fixtures.cleanRoot : EXP_DIR);
    ensureDir(path.join(outDir, 'C'));
    writeJson(path.join(outDir, 'C', 'licence.json'), { licenceLines: lic, forbiddenStrings: forb });
    log(`  matching lines: ${lic.matchCount}; forbidden-string hits: ${forb.hitCount}`);
    if (DRY) fixtures.licenceResult = lic;
  }

  run.finishedAt = new Date().toISOString();
  writeJson(path.join(outDir, 'run.json'), run);

  if (!opt['no-summary']) {
    log('\n=== summarise ===');
    summarise(outDir);
  }

  if (DRY) {
    const { assertDryRun } = await import('./dryrun.mjs');
    const result = assertDryRun({ outDir, armIds, fixtures, steps });
    writeJson(path.join(outDir, 'dry-run-assertions.json'), result);
    for (const c of result.checks) log(`  [${c.ok ? 'ok' : 'FAIL'}] ${c.name}${c.ok ? '' : ' -> ' + c.detail}`);
    log(result.failed ? `\nDRY RUN FAILED (${result.failed} of ${result.checks.length} checks)` : `\nDRY RUN PASSED (${result.checks.length} checks)`);
    if (result.failed) exitCode = 1;
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  if (browser) await browser.close();
  await stopAllServers();
}
process.exit(exitCode);
