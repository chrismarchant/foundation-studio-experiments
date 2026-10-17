import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }
export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

/** Recursively list files (relative, posix separators), skipping the given directory names. */
export function walkFiles(root, { skipDirs = ['node_modules', '.git'] } = {}) {
  const out = [];
  const rec = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    ents.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of ents) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!skipDirs.includes(e.name)) rec(full); }
      else if (e.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  rec(root);
  return out;
}

export function hashTree(root, opts) {
  const files = walkFiles(root, opts);
  const map = {};
  for (const f of files) map[f] = sha256(fs.readFileSync(path.join(root, f)));
  return map;
}

/** Run a command to completion, capturing stdout/stderr to files. */
export function runCommand(cmd, args, { cwd, outPrefix, env, timeoutMs = 600000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let stdout = '', stderr = '';
    let timedOut = false;
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: { ...process.env, ...(env || {}) }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    } catch (e) {
      resolve({ exitCode: -1, error: String(e), durationMs: 0 });
      return;
    }
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ exitCode: -1, error: String(e), durationMs: Date.now() - t0 }); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (outPrefix) {
        ensureDir(path.dirname(outPrefix));
        fs.writeFileSync(outPrefix + '.stdout.txt', stdout);
        fs.writeFileSync(outPrefix + '.stderr.txt', stderr);
      }
      resolve({ exitCode: code === null ? -1 : code, signal, timedOut, durationMs: Date.now() - t0,
        stdoutBytes: stdout.length, stderrBytes: stderr.length });
    });
  });
}

export function httpProbe(port, urlPath = '/', timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: urlPath, timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ up: true, status: res.statusCode });
    });
    req.on('error', () => resolve({ up: false }));
    req.on('timeout', () => { req.destroy(); resolve({ up: false }); });
  });
}

export async function waitForPort(port, { timeoutMs = 90000, isAlive } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (isAlive && !isAlive()) return { up: false, reason: 'process exited' };
    const r = await httpProbe(port);
    if (r.up) return { up: true, status: r.status, waitedMs: Date.now() - t0 };
    await sleep(250);
  }
  return { up: false, reason: 'timeout' };
}

export function gzipSize(buf) { return zlib.gzipSync(buf, { level: 9 }).length; }

export function round(n, d = 2) { const m = 10 ** d; return Math.round(n * m) / m; }
