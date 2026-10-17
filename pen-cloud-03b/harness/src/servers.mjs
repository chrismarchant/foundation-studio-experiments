import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, httpProbe, waitForPort, sleep } from './util.mjs';

const active = new Set();

export async function startArmServer(arm, logDir) {
  const pre = await httpProbe(arm.port);
  if (pre.up) return { ok: false, error: `port ${arm.port} already serving before start (stale server?)` };
  ensureDir(logDir);
  const logFile = path.join(logDir, 'server.log');
  const fd = fs.openSync(logFile, 'w');
  let exited = false;
  let child;
  try {
    child = spawn(arm.serve.cmd[0], arm.serve.cmd.slice(1), {
      cwd: arm.serve.cwd, detached: true, stdio: ['ignore', fd, fd],
      env: { ...process.env, PORT: String(arm.port) },
    });
  } catch (e) { return { ok: false, error: String(e) }; }
  child.on('exit', () => { exited = true; });
  child.on('error', () => { exited = true; });
  const handle = { child, arm, stopped: false };
  active.add(handle);
  const w = await waitForPort(arm.port, { timeoutMs: 90000, isAlive: () => !exited });
  if (!w.up) {
    await stopHandle(handle);
    return { ok: false, error: `server did not come up on ${arm.port}: ${w.reason}`, logFile };
  }
  return { ok: true, waitedMs: w.waitedMs, logFile, stop: () => stopHandle(handle) };
}

async function stopHandle(h) {
  if (h.stopped) return;
  h.stopped = true;
  const pid = h.child.pid;
  const gone = () => { try { process.kill(-pid, 0); return false; } catch { return true; } };
  try { process.kill(-pid, 'SIGTERM'); } catch {}
  for (let i = 0; i < 40 && !gone(); i++) await sleep(150);
  if (!gone()) { try { process.kill(-pid, 'SIGKILL'); } catch {} await sleep(300); }
  active.delete(h);
}

export async function stopAllServers() {
  for (const h of [...active]) await stopHandle(h);
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { await stopAllServers(); process.exit(130); });
}
process.on('exit', () => {
  for (const h of active) { try { process.kill(-h.child.pid, 'SIGKILL'); } catch {} }
});
