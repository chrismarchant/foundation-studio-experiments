import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import ssimPkg from 'ssim.js';
import { ROUTES, VIEWPORTS } from './config.mjs';
import { ensureDir, round } from './util.mjs';

const ssim = ssimPkg.ssim || ssimPkg.default || ssimPkg;

function pad(img, W, H) {
  if (img.width === W && img.height === H) return img;
  const out = new PNG({ width: W, height: H });
  out.data.fill(255);
  for (let y = 0; y < img.height; y++) {
    img.data.copy(out.data, y * W * 4, y * img.width * 4, (y + 1) * img.width * 4);
  }
  return out;
}

export function comparePngs(fileRef, fileArm, diffOut) {
  const a = PNG.sync.read(fs.readFileSync(fileRef));
  const b = PNG.sync.read(fs.readFileSync(fileArm));
  const W = Math.max(a.width, b.width), H = Math.max(a.height, b.height);
  const pa = pad(a, W, H), pb = pad(b, W, H);
  const diff = new PNG({ width: W, height: H });
  const mismatched = pixelmatch(pa.data, pb.data, diff.data, W, H, { threshold: 0.1, includeAA: false });
  if (diffOut) { ensureDir(path.dirname(diffOut)); fs.writeFileSync(diffOut, PNG.sync.write(diff)); }
  const t0 = Date.now();
  const s = ssim({ data: new Uint8ClampedArray(pa.data), width: W, height: H }, { data: new Uint8ClampedArray(pb.data), width: W, height: H });
  return {
    refSize: { w: a.width, h: a.height }, armSize: { w: b.width, h: b.height }, canvas: { w: W, h: H },
    mismatchedPixels: mismatched, mismatchRatio: round(mismatched / (W * H), 6),
    ssim: round(s.mssim, 5), ssimMs: Date.now() - t0,
    heightDiff: b.height - a.height, widthDiff: b.width - a.width,
  };
}

/** Compare every arm directory's PNGs against A's in the same out dir. */
export function runVisual(outDir, arms, { refArm = 'A', log = () => {} } = {}) {
  const results = {};
  const refDir = path.join(outDir, refArm);
  if (!fs.existsSync(refDir)) return { skipped: `no ${refArm} results in ${outDir}` };
  for (const arm of arms) {
    if (arm === refArm) continue;
    const res = { reference: refArm, routes: {} };
    for (const route of ROUTES) for (const vp of VIEWPORTS) {
      const name = `${route}-${vp.width}.png`;
      const fr = path.join(refDir, name), fa = path.join(outDir, arm, name);
      if (!fs.existsSync(fr) || !fs.existsSync(fa)) { (res.routes[route] ||= {})[vp.width] = { missing: !fs.existsSync(fr) ? 'ref' : 'arm' }; continue; }
      try {
        const r = comparePngs(fr, fa, path.join(outDir, arm, 'diff', name));
        r.diffPng = `${arm}/diff/${name}`;
        (res.routes[route] ||= {})[vp.width] = r;
        log(`  visual ${arm} ${route}@${vp.width}: mismatch ${(r.mismatchRatio * 100).toFixed(2)}% ssim ${r.ssim} dH ${r.heightDiff}`);
      } catch (e) { (res.routes[route] ||= {})[vp.width] = { error: String(e).slice(0, 300) }; }
    }
    results[arm] = res;
  }
  return results;
}
