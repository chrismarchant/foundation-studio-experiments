import fs from 'node:fs';
import path from 'node:path';
import { runCommand, hashTree, sha256, ensureDir } from './util.mjs';
import { resolveScriptDir, findDist } from './build.mjs';

/** Parse FROZEN.md for (path, sha256) pairs. Tolerant: any line with a 64-hex token and a path-like token. */
export function parseFrozen(text) {
  const entries = [];
  const aggregates = new Set();
  for (const line of text.split(/\r?\n/)) {
    const hexes = [...line.matchAll(/(?:sha256[:=]\s*)?\b([0-9a-f]{64})\b/gi)].map((m) => m[1].toLowerCase());
    if (!hexes.length) continue;
    const rest = line.replace(/(?:sha256[:=]\s*)?\b[0-9a-f]{64}\b/gi, ' ');
    const toks = rest.split(/[\s|`*]+/).filter((t) => /[./\\]/.test(t) && !/^https?:/.test(t));
    const p = toks.find((t) => /\.[a-z0-9]{1,6}$/i.test(t)) || toks[0];
    if (p) entries.push({ path: p.replace(/^\.\//, '').replace(/[,;:]+$/, ''), sha256: hexes[0] });
    hexes.forEach((h) => aggregates.add(h));
  }
  return { entries, allHashes: [...aggregates] };
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
  const { entries } = parseFrozen(frozenText);
  const norm = (p) => p.replace(/^\.?\//, '').replace(/\\/g, '/');
  const byPath = new Map(entries.map((e) => [norm(e.path), e.sha256]));
  const matched = [], mismatched = [], frozenNotOnDisk = [];
  for (const [p, h] of byPath) {
    if (!(p in rootHashes)) frozenNotOnDisk.push(p);
    else if (rootHashes[p] === h) matched.push(p);
    else mismatched.push({ file: p, actual: rootHashes[p], frozen: h });
  }
  const unlisted = Object.keys(rootHashes).filter((p) => !byPath.has(p));
  return { frozenEntries: byPath.size, matched: matched.length, mismatched, frozenNotOnDisk, unlisted,
    allMatch: byPath.size > 0 && mismatched.length === 0 && frozenNotOnDisk.length === 0 };
}

export async function runDeterminism({ armCDir, outDir, armId = 'C', log = () => {} }) {
  const dir = ensureDir(path.join(outDir, armId));
  const out = { armCDir };
  // 1. generate:verify
  const gv = await runCommand('pnpm', ['generate:verify'], { cwd: armCDir, outPrefix: path.join(dir, 'generate-verify') });
  out.generateVerify = { ...gv, stdoutFile: `${armId}/generate-verify.stdout.txt`, stderrFile: `${armId}/generate-verify.stderr.txt` };
  log(`  generate:verify exit ${gv.exitCode}`);
  // 2. generated hashes vs FROZEN.md
  const genDir = path.join(armCDir, 'app', 'src', 'generated');
  const frozenFile = path.join(armCDir, 'FROZEN.md');
  out.generated = { dir: genDir, exists: fs.existsSync(genDir) };
  if (out.generated.exists) {
    const hashes = hashTree(genDir);
    out.generated.fileCount = Object.keys(hashes).length;
    out.generated.hashes = hashes;
    if (fs.existsSync(frozenFile)) {
      out.frozen = { file: frozenFile, ...compareFrozen(hashes, fs.readFileSync(frozenFile, 'utf8')) };
    } else out.frozen = { file: frozenFile, missing: true };
  }
  // r2 comparison: hash app/src/generated and generator keyed by arm-c-root-relative path
  const rootHashes = {};
  for (const sub of ['app/src/generated', 'generator']) {
    const d = path.join(armCDir, sub);
    if (fs.existsSync(d)) for (const [f, h] of Object.entries(hashTree(d))) rootHashes[`${sub}/${f}`] = h;
  }
  out.rootHashes = { fileCount: Object.keys(rootHashes).length };
  out.frozenRoot = fs.existsSync(frozenFile) ? { file: frozenFile, ...compareFrozenRoot(rootHashes, fs.readFileSync(frozenFile, 'utf8')) } : { file: frozenFile, missing: true };
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
