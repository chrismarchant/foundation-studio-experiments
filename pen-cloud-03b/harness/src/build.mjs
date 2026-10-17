import fs from 'node:fs';
import path from 'node:path';
import { runCommand, walkFiles, gzipSize, ensureDir } from './util.mjs';

export function hasScript(dir, script) {
  try { const p = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); return !!(p.scripts && p.scripts[script]); } catch { return false; }
}
export function resolveScriptDir(dirs, script) {
  return dirs.find((d) => hasScript(d, script)) || null;
}

export function findDist(dirs) {
  for (const d of dirs) for (const n of ['dist', 'build', 'out']) {
    const p = path.join(d, n);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return null;
}

export function bundleSizes(distDir) {
  if (!distDir) return null;
  const files = walkFiles(distDir);
  const rows = files.map((f) => {
    const buf = fs.readFileSync(path.join(distDir, f));
    return { file: f, bytes: buf.length, gzipBytes: /\.(js|css|html|svg|json|map|txt)$/i.test(f) ? gzipSize(buf) : null };
  });
  const byExt = {};
  for (const r of rows) {
    const e = path.extname(r.file).toLowerCase() || '(none)';
    const b = (byExt[e] ||= { files: 0, bytes: 0, gzipBytes: 0 });
    b.files++; b.bytes += r.bytes; b.gzipBytes += r.gzipBytes || 0;
  }
  return { distDir, fileCount: rows.length, totalBytes: rows.reduce((a, r) => a + r.bytes, 0), byExt, files: rows };
}

export async function runBuild(arm, outDir) {
  const dir = resolveScriptDir(arm.buildDirs, 'build');
  if (!dir) return { ran: false, exitCode: null, error: `no package.json with a "build" script in ${arm.buildDirs.join(' or ')}` };
  const prefix = path.join(ensureDir(path.join(outDir, arm.id)), 'build');
  const r = await runCommand('pnpm', ['build'], { cwd: dir, outPrefix: prefix });
  const dist = findDist([dir, ...arm.buildDirs]);
  return { ran: true, cwd: dir, command: 'pnpm build', ...r, stdoutFile: `${arm.id}/build.stdout.txt`, stderrFile: `${arm.id}/build.stderr.txt`, bundle: bundleSizes(dist) };
}
