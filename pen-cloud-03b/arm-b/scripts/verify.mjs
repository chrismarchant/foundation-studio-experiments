// Verification: start both servers, GET every route (+ bp variants for the static arm), check 200 and heading text, stop.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const EXPECT = {
  button: ['Button'],
  navbar: ['Button', 'navbar17-'],
  header80: ['Design systems that move with your product', 'data-fs-motion="images-left"', 'data-fs-motion="images-right"'],
  layout620: ['Three reasons teams pick this synthetic product'],
  testimonial37: ['Customer testimonials'],
  cta25: ['Ready to try the synthetic product?'],
  page: ['Design systems that move with your product', 'Three reasons teams pick this synthetic product', 'Customer testimonials', 'Ready to try the synthetic product?'],
};
const arms = [
  { name: 'B  static', port: 4302, cmd: ['pnpm', ['serve']], bp: true },
  { name: "B' react ", port: 4303, cmd: ['pnpm', ['serve:react']], bp: false },
];
let fail = 0;
for (const arm of arms) {
  const child = spawn(arm.cmd[0], arm.cmd[1], { stdio: 'ignore', detached: true });
  try {
    for (let i = 0; i < 50; i++) {
      try { await fetch(`http://127.0.0.1:${arm.port}/page`); break; } catch { await sleep(200); }
    }
    for (const [route, needles] of Object.entries(EXPECT)) {
      const variants = arm.bp ? ['', '?bp=tablet', '?bp=mobile'] : [''];
      for (const q of variants) {
        const r = await fetch(`http://127.0.0.1:${arm.port}/${route}${q}`);
        const t = await r.text();
        const subj = t.includes(`data-fs-subject="${route}"`);
        const missing = needles.filter((n) => !t.includes(n));
        const ok = r.status === 200 && subj && !missing.length;
        if (!ok) fail++;
        console.log(`${ok ? 'PASS' : 'FAIL'} ${arm.name} /${route}${q} ${r.status} ${t.length}B subject=${subj}${missing.length ? ' missing=' + JSON.stringify(missing) : ''}`);
      }
    }
    const f = await fetch(`http://127.0.0.1:${arm.port}/fonts/source-sans-3.css`);
    console.log(`${f.status === 200 ? 'PASS' : 'FAIL'} ${arm.name} /fonts/source-sans-3.css ${f.status}`);
    if (f.status !== 200) fail++;
  } finally {
    try { process.kill(-child.pid); } catch {}
    await sleep(300);
  }
}
process.exit(fail ? 1 : 0);
