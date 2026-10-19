import fs from 'node:fs';
import path from 'node:path';
import { runCommand, hashTree, sha256, ensureDir } from './util.mjs';
import { resolveScriptDir, findDist } from './build.mjs';
import { INPUTS_DIR } from './config.mjs';

// ---------- D-7: choose the FROZEN file and the generate:verify script that belong to the manifest's DSC revision ----------
const hexOf = (rev) => { const m = /([0-9a-f]{64})/i.exec(String(rev || '')); return m ? m[1].toLowerCase() : null; };
const natural = (a, b) => a.localeCompare(b, 'en', { numeric: true });

/** `- DSC revision: sha256:<hex>` header line of a FROZEN*.md (null when absent). */
export function parseFrozenRevision(text) {
  const m = /^[\s>*-]*DSC revision:\s*`?(?:sha256:)?([0-9a-f]{64})`?/im.exec(text);
  return m ? `sha256:${m[1].toLowerCase()}` : null;
}

/** Every `FROZEN*.md` in the arm-c root with the DSC revision it declares. */
export function listFrozenFiles(armCDir) {
  let names = [];
  try { names = fs.readdirSync(armCDir).filter((n) => /^FROZEN.*\.md$/i.test(n)).sort(natural); } catch {}
  return names.map((name) => {
    let revision = null;
    try { revision = parseFrozenRevision(fs.readFileSync(path.join(armCDir, name), 'utf8')); } catch {}
    return { name, file: path.join(armCDir, name), revision };
  });
}

/** `--dsc <path>` / `--dsc=<path>` of a package.json script command (null when absent). */
export function dscArgOfScript(cmd) {
  const m = /(?:^|\s)--dsc(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(String(cmd));
  return m ? (m[1] || m[2] || m[3]) : null;
}

/** All `generate:verify*` scripts of <arm-c>/package.json with the DSC (resolved under ../inputs) each one verifies against. */
export function listVerifyScripts(armCDir, inputsDir = INPUTS_DIR) {
  let scripts = {};
  try { scripts = JSON.parse(fs.readFileSync(path.join(armCDir, 'package.json'), 'utf8')).scripts || {}; } catch {}
  return Object.entries(scripts).filter(([n]) => /^generate:verify/.test(n)).sort(([a], [b]) => natural(a, b)).map(([name, command]) => {
    const dsc = dscArgOfScript(command);
    let revision = null, dscFile = null;
    if (dsc) {
      dscFile = path.resolve(inputsDir, dsc);
      try { revision = JSON.parse(fs.readFileSync(dscFile, 'utf8')).revision ?? null; } catch {}
    }
    return { name, command, dsc, dscFile, revision };
  });
}

/**
 * Select the frozen-hash file and the verify script for the arm-c tree on disk.
 *  - manifestRevision: <arm-c>/app/src/generated/generated-manifest.json -> dsc.revision
 *  - frozenFile: the FROZEN*.md whose `DSC revision:` line equals it (overridable with `frozenOverride`)
 *  - verifyScript: the generate:verify* script whose `--dsc` file has that revision; fallback `generate:verify`
 *    (overridable with `verifyOverride`)
 * Never throws; `selectionOk` is false when the FROZEN file could not be determined.
 */
export function selectDeterminismInputs({ armCDir, inputsDir = INPUTS_DIR, frozenOverride = null, verifyOverride = null }) {
  const warnings = [];
  const manifestPath = path.join(armCDir, 'app', 'src', 'generated', 'generated-manifest.json');
  let manifestRevision = null;
  try { manifestRevision = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).dsc?.revision ?? null; } catch (e) { warnings.push(`generated-manifest.json not readable: ${String(e.message || e).slice(0, 120)}`); }
  if (!manifestRevision) warnings.push('generated-manifest.json has no dsc.revision');
  const want = hexOf(manifestRevision);
  const frozenCandidates = listFrozenFiles(armCDir);
  const verifyCandidates = listVerifyScripts(armCDir, inputsDir);
  const basis = { frozen: null, verifyScript: null };
  let frozen = null, verifyScript = null;

  if (frozenOverride) {
    const f = path.resolve(armCDir, frozenOverride);
    frozen = { name: path.basename(f), file: f, revision: null };
    try { frozen.revision = parseFrozenRevision(fs.readFileSync(f, 'utf8')); } catch { warnings.push(`--frozen ${frozenOverride}: not readable`); }
    basis.frozen = `override: --frozen ${frozenOverride}`;
    if (want && frozen.revision && hexOf(frozen.revision) !== want) warnings.push(`--frozen ${frozenOverride} declares DSC revision ${frozen.revision}, manifest says ${manifestRevision}`);
  } else if (want) {
    const hits = frozenCandidates.filter((c) => hexOf(c.revision) === want);
    if (hits.length) {
      frozen = hits[hits.length - 1];
      basis.frozen = hits.length === 1 ? `${frozen.name} declares DSC revision == manifest dsc.revision` : `${hits.length} FROZEN files declare the manifest revision (${hits.map((h) => h.name).join(', ')}); took the last in natural order`;
      if (hits.length > 1) warnings.push(basis.frozen);
    } else basis.frozen = `no FROZEN*.md in the arm-c root declares DSC revision ${manifestRevision}`;
  } else basis.frozen = 'manifest revision unavailable: cannot select a FROZEN file';

  if (verifyOverride) {
    verifyScript = verifyOverride;
    basis.verifyScript = `override: --verify-script ${verifyOverride}`;
    if (!verifyCandidates.some((c) => c.name === verifyOverride)) warnings.push(`--verify-script ${verifyOverride} is not a generate:verify* script in package.json`);
  } else {
    const withDsc = verifyCandidates.filter((c) => c.dsc);
    const hits = want ? withDsc.filter((c) => hexOf(c.revision) === want) : [];
    if (hits.length) {
      verifyScript = hits[hits.length - 1].name;
      basis.verifyScript = `${verifyScript} runs --dsc ${hits[hits.length - 1].dsc} whose revision == manifest dsc.revision`;
      if (hits.length > 1) warnings.push(`${hits.length} verify scripts match the manifest revision (${hits.map((h) => h.name).join(', ')}); took the last in natural order`);
    } else {
      verifyScript = 'generate:verify';
      basis.verifyScript = !withDsc.length ? 'fallback generate:verify: no generate:verify* script carries --dsc'
        : want ? `fallback generate:verify: none of ${withDsc.map((c) => c.name).join(', ')} verifies DSC revision ${manifestRevision} (the bare script uses the generator's default DSC)`
          : 'fallback generate:verify: manifest revision unavailable';
      if (withDsc.length) warnings.push(basis.verifyScript);
      if (!verifyCandidates.some((c) => c.name === 'generate:verify')) warnings.push('package.json has no generate:verify script');
    }
  }
  return {
    manifestPath, manifestRevision,
    frozenFile: frozen ? frozen.file : null, frozenFileName: frozen ? frozen.name : null, frozenFileRevision: frozen ? frozen.revision : null,
    verifyScript, selectionBasis: basis, selectionOk: !!frozen, warnings,
    candidates: {
      frozen: frozenCandidates.map((c) => ({ file: c.name, revision: c.revision })),
      verifyScripts: verifyCandidates.map((c) => ({ script: c.name, dsc: c.dsc, revision: c.revision })),
    },
  };
}

/**
 * Parse a FROZEN*.md for (path, sha256) pairs. Tolerant: any line with a 64-hex token and a path-like token.
 * When the file has a fenced block (``` ... ```) that contains hash lines (FROZEN-r2.md format), only the fenced
 * lines are entries: header lines such as "- generated-manifest.json sha256: <hex>" are metadata, and treating them
 * as entries made every such file report a phantom "frozen file not on disk" (reported as `headerHashLines`).
 */
export function parseFrozen(text) {
  const lines = text.split(/\r?\n/);
  const hexRe = /(?:sha256[:=]\s*)?\b([0-9a-f]{64})\b/gi;
  let inFence = false;
  const rows = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return { line, fenced: false, fence: true }; }
    return { line, fenced: inFence, fence: false };
  });
  const fencedHasHash = rows.some((r) => r.fenced && /\b[0-9a-f]{64}\b/i.test(r.line));
  const entries = [];
  const headerHashLines = [];
  const aggregates = new Set();
  for (const r of rows) {
    const hexes = [...r.line.matchAll(hexRe)].map((m) => m[1].toLowerCase());
    if (!hexes.length) continue;
    hexes.forEach((h) => aggregates.add(h));
    if (fencedHasHash && !r.fenced) { headerHashLines.push(r.line.trim().slice(0, 160)); continue; }
    const rest = r.line.replace(/(?:sha256[:=]\s*)?\b[0-9a-f]{64}\b/gi, ' ');
    const toks = rest.split(/[\s|`*]+/).filter((t) => /[./\\]/.test(t) && !/^https?:/.test(t));
    const p = toks.find((t) => /\.[a-z0-9]{1,6}$/i.test(t)) || toks[0];
    if (p) entries.push({ path: p.replace(/^\.\//, '').replace(/[,;:]+$/, ''), sha256: hexes[0] });
  }
  return { entries, allHashes: [...aggregates], headerHashLines, fencedOnly: fencedHasHash };
}

export function compareFrozen(genHashes, frozenText) {
  const { entries, allHashes } = parseFrozen(frozenText);
  const matched = [], mismatched = [], notInFrozen = [];
  const usedEntries = new Set();
  for (const [rel, h] of Object.entries(genHashes)) {
    const e = entries.find((x, i) => (rel === x.path || rel.endsWith('/' + x.path) || x.path.endsWith('/' + rel)) && (usedEntries.add(i), true));
    if (!e) { notInFrozen.push({ file: rel, sha256: h, hashAppearsInFrozen: allHashes.includes(h) }); continue; }
    if (e.sha256 === h) matched.push(rel); else mismatched.push({ file: rel, actual: h, frozen: e.sha256 });
  }
  const frozenNotOnDisk = entries.filter((_, i) => !usedEntries.has(i)).map((e) => e.path);
  const sortedPairs = Object.entries(genHashes).sort().map(([k, v]) => `${k} ${v}`).join('\n');
  const aggPathHash = sha256(sortedPairs), aggPathHashNl = sha256(sortedPairs + '\n');
  const aggregateFound = allHashes.includes(aggPathHash) || allHashes.includes(aggPathHashNl);
  return {
    frozenEntries: entries.length, matched: matched.length, mismatched, notInFrozen, frozenNotOnDisk,
    aggregateFound, allMatch: entries.length > 0 && mismatched.length === 0 && notInFrozen.length === 0 && frozenNotOnDisk.length === 0,
  };
}

/** r2: FROZEN.md paths are relative to the arm-c root; compare every entry by exact path. */
export function compareFrozenRoot(rootHashes, frozenText) {
  const parsed = parseFrozen(frozenText);
  const { entries } = parsed;
  const norm = (p) => p.replace(/^\.?\//, '').replace(/\\/g, '/');
  const byPath = new Map(entries.map((e) => [norm(e.path), e.sha256]));
  const matched = [], mismatched = [], frozenNotOnDisk = [];
  for (const [p, h] of byPath) {
    if (!(p in rootHashes)) frozenNotOnDisk.push(p);
    else if (rootHashes[p] === h) matched.push(p);
    else mismatched.push({ file: p, actual: rootHashes[p], frozen: h });
  }
  const unlisted = Object.keys(rootHashes).filter((p) => !byPath.has(p));
  return { frozenEntries: byPath.size, headerHashLinesIgnored: parsed.fencedOnly ? parsed.headerHashLines : [], matched: matched.length, mismatched, frozenNotOnDisk, unlisted,
    allMatch: byPath.size > 0 && mismatched.length === 0 && frozenNotOnDisk.length === 0 };
}

export async function runDeterminism({ armCDir, outDir, armId = 'C', inputsDir = INPUTS_DIR, frozenOverride = null, verifyOverride = null, harnessDscRevision = null, log = () => {} }) {
  const dir = ensureDir(path.join(outDir, armId));
  const out = { armCDir };
  // 0. D-7: pick the FROZEN file and the verify script that belong to the manifest's DSC revision (read before anything runs)
  const sel = selectDeterminismInputs({ armCDir, inputsDir, frozenOverride, verifyOverride });
  out.frozenFile = sel.frozenFile;
  out.verifyScript = sel.verifyScript;
  out.manifestRevision = sel.manifestRevision;
  out.selectionBasis = sel.selectionBasis;
  out.selection = { ok: sel.selectionOk, frozenFileRevision: sel.frozenFileRevision, harnessDscRevision, manifestMatchesHarnessDsc: harnessDscRevision && sel.manifestRevision ? harnessDscRevision === sel.manifestRevision : null,
    warnings: sel.warnings, candidates: sel.candidates };
  log(`  selected FROZEN: ${sel.frozenFileName || 'NONE'}; verify script: ${sel.verifyScript}; manifest revision ${sel.manifestRevision} (${sel.selectionBasis.frozen})`);
  // 1. generate:verify (selected script)
  const gv = await runCommand('pnpm', [sel.verifyScript], { cwd: armCDir, outPrefix: path.join(dir, 'generate-verify') });
  out.generateVerify = { script: sel.verifyScript, ...gv, stdoutFile: `${armId}/generate-verify.stdout.txt`, stderrFile: `${armId}/generate-verify.stderr.txt` };
  log(`  ${sel.verifyScript} exit ${gv.exitCode}`);
  // 2. generated hashes vs the selected FROZEN file
  const genDir = path.join(armCDir, 'app', 'src', 'generated');
  const frozenFile = sel.frozenFile;
  out.generated = { dir: genDir, exists: fs.existsSync(genDir) };
  if (out.generated.exists) {
    const hashes = hashTree(genDir);
    out.generated.fileCount = Object.keys(hashes).length;
    out.generated.hashes = hashes;
    if (frozenFile && fs.existsSync(frozenFile)) {
      out.frozen = { file: frozenFile, ...compareFrozen(hashes, fs.readFileSync(frozenFile, 'utf8')) };
    } else out.frozen = { file: frozenFile, missing: true, reason: sel.selectionBasis.frozen };
  }
  // r2+ comparison: hash app/src/generated and generator keyed by arm-c-root-relative path
  const rootHashes = {};
  for (const sub of ['app/src/generated', 'generator']) {
    const d = path.join(armCDir, sub);
    if (fs.existsSync(d)) for (const [f, h] of Object.entries(hashTree(d))) rootHashes[`${sub}/${f}`] = h;
  }
  out.rootHashes = { fileCount: Object.keys(rootHashes).length };
  out.frozenRoot = frozenFile && fs.existsSync(frozenFile) ? { file: frozenFile, ...compareFrozenRoot(rootHashes, fs.readFileSync(frozenFile, 'utf8')) } : { file: frozenFile, missing: true, reason: sel.selectionBasis.frozen };
  // 3. bundle reproducibility: two builds, compare dist hashes
  const buildDir = resolveScriptDir([path.join(armCDir, 'app'), armCDir], 'build') || null;
  out.bundleReproducibility = { buildDir };
  if (buildDir) {
    const runs = [];
    for (let i = 1; i <= 2; i++) {
      const dist = findDist([buildDir]);
      if (dist) fs.rmSync(dist, { recursive: true, force: true });
      const b = await runCommand('pnpm', ['build'], { cwd: buildDir, outPrefix: path.join(dir, `repro-build-${i}`) });
      const d = findDist([buildDir]);
      runs.push({ exitCode: b.exitCode, durationMs: b.durationMs, distDir: d, hashes: d ? hashTree(d) : null });
      log(`  repro build ${i} exit ${b.exitCode}`);
    }
    const [r1, r2] = runs;
    const diffs = [];
    if (r1.hashes && r2.hashes) {
      const keys = new Set([...Object.keys(r1.hashes), ...Object.keys(r2.hashes)]);
      for (const k of [...keys].sort()) if (r1.hashes[k] !== r2.hashes[k]) diffs.push({ file: k, run1: r1.hashes[k] || null, run2: r2.hashes[k] || null });
    }
    out.bundleReproducibility = {
      buildDir, exitCodes: runs.map((r) => r.exitCode), fileCounts: runs.map((r) => (r.hashes ? Object.keys(r.hashes).length : null)),
      identical: !!(r1.hashes && r2.hashes) && r1.exitCode === 0 && r2.exitCode === 0 && diffs.length === 0, differingFiles: diffs,
    };
  }
  return out;
}
