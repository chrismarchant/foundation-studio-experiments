// Mechanical wrapping of the deduped Penpot fragments (Arm B / B').
// Reads generated/, writes wrapped/<bp>/<route>.html|.css (+ wrapped/prelude.css, wrap-log.json).
// Edits to Penpot markup: ONLY the two data-fs-motion attributes on the Header80 ImagesLeft/ImagesRight
// frames (spliced into the opening tag). Everything else is wrapper elements around untouched fragments.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(ROOT, 'generated');
const OUT = join(ROOT, 'wrapped');
const BPS = ['desktop', 'tablet', 'mobile'];
const SECTIONS = ['navbar', 'header80', 'layout620', 'testimonial37', 'cta25'];
const ROUTES = ['button', ...SECTIONS, 'page'];
const SCROLL_VH = { desktop: 300, tablet: 300, mobile: 150 };
const read = (...p) => readFileSync(join(GEN, ...p), 'utf8');

const PRELUDE = `/* Wrapper prelude (Arm B / B'): not Penpot output. Reproduces the flex-column body Penpot's CSS assumes. */
html, body { background: #fff; }
.fs-stage { box-sizing: border-box; display: flex; flex-direction: column; align-items: center; width: 100%; }
.fs-button-stage { box-sizing: border-box; display: flex; justify-content: center; width: 100%; max-width: 1440px; padding: 80px; }
.fs-button-row { display: flex; gap: 16px; }
.fs-button-slot { position: relative; flex: none; }
.fs-button-origin { position: absolute; width: 100%; height: 100%; }
`;

const isEl = (n) => typeof n.tagName === 'string';
function* walk(node) {
  for (const c of node.childNodes ?? []) {
    if (isEl(c)) yield c;
    yield* walk(c);
  }
}
const classes = (n) => (n.attrs.find((a) => a.name === 'class')?.value ?? '').split(/\s+/);

// Header80: add data-fs-motion to the ImagesLeft / ImagesRight frames (Penpot truncates names to 10 chars).
function markMotion(html) {
  const frag = parseFragment(html, { sourceCodeLocationInfo: true });
  const inserts = [];
  for (const el of walk(frag)) {
    for (const [prefix, value] of [['images-left-', 'images-left'], ['images-righ-', 'images-right']]) {
      const tok = classes(el).find((c) => c.startsWith(prefix));
      if (tok) {
        const at = el.sourceCodeLocation.startTag.startOffset + 1 + el.tagName.length;
        inserts.push({ at, text: ` data-fs-motion="${value}"`, value, class: tok });
      }
    }
  }
  if (inserts.length !== 2 || new Set(inserts.map((i) => i.value)).size !== 2) {
    throw new Error(`expected exactly one images-left and one images-right frame, got ${JSON.stringify(inserts)}`);
  }
  inserts.sort((a, b) => b.at - a.at);
  let out = html;
  for (const i of inserts) out = out.slice(0, i.at) + i.text + out.slice(i.at);
  return { html: out, marked: inserts.map(({ value, class: c }) => ({ value, class: c })) };
}

// Library mains are exported as absolutely positioned (left/top, width:100%). Each gets a slot sized from
// its own min-width/min-height and an origin box offset by -left/-top so the main sits at the slot origin.
function buttonStage() {
  const html = read('library', 'button.html');
  const css = read('library', 'button.css');
  const mains = [...html.matchAll(/^<div class="frame (button-b-[0-9a-f]{12})">/gm)].map((m) => m[1]);
  if (mains.length !== 2) throw new Error('expected 2 button mains');
  const parts = [read('library', 'button-primary.html'), read('library', 'button-secondary.html')];
  const info = [];
  const slots = mains.map((cls, i) => {
    const block = css.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`))[1];
    const px = (prop) => Number(block.match(new RegExp(`(?:^|\\n)\\s*${prop}: (-?[\\d.]+)px`))[1]);
    const d = { class: cls, left: px('left'), top: px('top'), w: px('min-width'), h: px('min-height') };
    info.push(d);
    const body = parts[i].replace(/\n+$/, '\n'); // fragment bytes verbatim (no re-indent)
    return `    <div class="fs-button-slot" style="width:${d.w}px;height:${d.h}px">\n      <div class="fs-button-origin" style="left:${-d.left}px;top:${-d.top}px">\n${body}      </div>\n    </div>\n`;
  });
  return {
    html: `<div data-fs-subject="button" class="fs-button-stage">\n  <div class="fs-button-row">\n${slots.join('')}  </div>\n</div>\n`,
    css,
    info,
  };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'prelude.css'), PRELUDE);
const log = { script: 'scripts/wrap.mjs', preludeBytes: PRELUDE.length, outputs: [] };
const btn = buttonStage();

for (const bp of BPS) {
  const dir = join(OUT, bp);
  mkdirSync(dir, { recursive: true });
  const sec = {};
  for (const s of SECTIONS) {
    let html = read(bp, `${s}.html`);
    let motion = null;
    if (s === 'header80') {
      const m = markMotion(html);
      html = m.html;
      motion = m.marked;
    }
    sec[s] = { html, css: read(bp, `${s}.css`), motion };
  }
  const verbatim = (h) => h.replace(/\n+$/, '\n'); // fragment bytes verbatim (no re-indent)
  const scrollStyle = ` style="height:${SCROLL_VH[bp]}vh"`;
  const out = {
    button: { html: btn.html, css: btn.css, extra: { slots: btn.info } },
    page: {
      html: `<div data-fs-subject="page" class="fs-stage">\n${SECTIONS.map((s) =>
        `  <div data-fs-section="${s}" class="fs-stage"${s === 'header80' ? scrollStyle : ''}>\n${verbatim(sec[s].html)}  </div>\n`).join('')}</div>\n`,
      css: SECTIONS.map((s) => sec[s].css).join('\n'),
      extra: { scrollHeightVh: SCROLL_VH[bp] },
    },
  };
  for (const s of SECTIONS) {
    out[s] = {
      html: `<div data-fs-subject="${s}" class="fs-stage"${s === 'header80' ? scrollStyle : ''}>\n${verbatim(sec[s].html)}</div>\n`,
      css: sec[s].css,
      extra: s === 'header80' ? { scrollHeightVh: SCROLL_VH[bp], motionAttributes: sec[s].motion } : {},
    };
  }
  for (const r of ROUTES) {
    writeFileSync(join(dir, `${r}.html`), out[r].html);
    writeFileSync(join(dir, `${r}.css`), out[r].css);
    log.outputs.push({ bp, route: r, htmlBytes: out[r].html.length, cssBytes: out[r].css.length, ...out[r].extra });
  }
}
log.motionAttributesAdded = log.outputs.filter((o) => o.route === 'header80').length * 2 + log.outputs.filter((o) => o.route === 'page').length * 2;
writeFileSync(join(OUT, 'wrap-log.json'), JSON.stringify(log, null, 2) + '\n');
console.log(`wrapped ${log.outputs.length} route variants; motion attributes in route files: ${log.outputs.filter((o) => o.route === 'header80').length * 2}`);
