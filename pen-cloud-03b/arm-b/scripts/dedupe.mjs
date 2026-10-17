// Deterministic de-duplication of Penpot generateMarkup output (Arm B / B').
//
// Known generator defect: after the correct nested copy of a tree, every nested subtree is
// emitted AGAIN as a top-level sibling. This script removes every top-level element whose class
// token set (the Penpot-derived classes, which carry the shape-id suffix such as
// `label-cdf80dc015a8`) already appears anywhere inside an earlier retained top-level element.
// Removal is done by splicing source ranges (parse5 location info), so every retained byte of the
// markup is untouched. The comment that directly precedes a removed element is removed with it.
//
// The ONLY edit to Penpot's CSS: the literal font-family value "sourcesanspro" -> "Source Sans 3".
//
// Outputs: generated/<board>/<route>.html|.css, generated/library/button*.html|.css,
//          generated/dedupe-log.json
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'generated');
const input = JSON.parse(readFileSync(join(ROOT, 'penpot-output.json'), 'utf8'));

const ROUTE_BY_SECTION = {
  Navbar17: 'navbar',
  'Header80 / StickyStage': 'header80',
  Layout620: 'layout620',
  Testimonial37: 'testimonial37',
  Cta25: 'cta25',
  'Button/Primary': 'button-primary',
  'Button/Secondary': 'button-secondary',
};
const FONT_FROM = '"sourcesanspro"';
const FONT_TO = '"Source Sans 3"';
const ID_SUFFIX = /-([0-9a-f]{12})$/;

const sha = (s) => createHash('sha256').update(s).digest('hex');
const isEl = (n) => typeof n.tagName === 'string';
const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value ?? '';
const tokens = (n) => attr(n, 'class').split(/\s+/).filter(Boolean);
const idOf = (n) => tokens(n).find((c) => ID_SUFFIX.test(c)) ?? null;
// Only shape elements carry an id-suffixed class (e.g. `frame label-cdf80dc015a8`); the rich-text
// internals (`root-0`, `paragraph-set ...`) reuse generic class names scoped by their parent shape
// and are not dedupe keys.
const keyOf = (n) => (idOf(n) ? tokens(n).sort().join(' ') : '');

function* walk(node) {
  for (const c of node.childNodes ?? []) {
    if (isEl(c)) yield c;
    yield* walk(c);
  }
}
const countEls = (root) => [...walk(root)].length;

function dedupeHtml(html) {
  const frag = parseFragment(html, { sourceCodeLocationInfo: true });
  const kids = frag.childNodes;
  const before = countEls(frag);
  const seen = new Set();
  const removed = [];
  const cuts = [];
  let topLevelBefore = 0;
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i];
    if (!isEl(n)) continue;
    topLevelBefore++;
    const key = keyOf(n);
    const keys = [key, ...[...walk(n)].map(keyOf)];
    if (key && seen.has(key)) {
      // start of range: preceding comment (skipping whitespace-only text), else the element itself
      let start = n.sourceCodeLocation.startOffset;
      for (let j = i - 1; j >= 0; j--) {
        const p = kids[j];
        if (p.nodeName === '#text' && !p.value.trim()) continue;
        if (p.nodeName === '#comment') start = p.sourceCodeLocation.startOffset;
        break;
      }
      let end = n.sourceCodeLocation.endOffset;
      if (html[end] === '\n') end++;
      cuts.push([start, end]);
      removed.push({ id: idOf(n), class: attr(n, 'class'), elements: 1 + countEls(n) });
    } else {
      for (const k of keys) seen.add(k);
    }
  }
  let out = '';
  let pos = 0;
  for (const [s, e] of cuts) {
    out += html.slice(pos, s);
    pos = e;
  }
  out += html.slice(pos);

  // Invariants: no class set and no DOM id repeats after dedupe; nothing unique was lost.
  const after = parseFragment(out);
  const afterEls = [...walk(after)];
  const keysAfter = afterEls.map(keyOf).filter(Boolean);
  const dup = keysAfter.filter((k, i) => keysAfter.indexOf(k) !== i);
  const idsAfter = afterEls.map((e) => attr(e, 'id')).filter(Boolean);
  const dupIds = idsAfter.filter((k, i) => idsAfter.indexOf(k) !== i);
  const keysBefore = new Set([...walk(frag)].map(keyOf).filter(Boolean));
  const lost = [...keysBefore].filter((k) => !new Set(keysAfter).has(k));
  if (dup.length || dupIds.length || lost.length) {
    throw new Error(`dedupe invariant failed: dup=${dup} dupIds=${dupIds} lost=${lost}`);
  }
  return {
    html: out,
    log: {
      topLevelBefore,
      topLevelAfter: topLevelBefore - removed.length,
      elementsBefore: before,
      elementsAfter: afterEls.length,
      removedCount: removed.length,
      removedElements: before - afterEls.length,
      removedIds: removed.map((r) => r.id),
      removed,
    },
  };
}

rmSync(OUT, { recursive: true, force: true });
const log = {
  tool: { script: 'scripts/dedupe.mjs', parser: 'parse5@8.0.1' },
  input: { file: 'penpot-output.json', sha256: sha(readFileSync(join(ROOT, 'penpot-output.json'))), capturedAt: input.capturedAt },
  fontAlias: { from: FONT_FROM, to: FONT_TO },
  items: [],
};
const lib = {};

for (const it of input.items) {
  const route = ROUTE_BY_SECTION[it.section];
  if (!route) throw new Error(`unmapped section ${it.section}`);
  const { html, log: l } = dedupeHtml(it.html);
  const fontCount = it.css.split(FONT_FROM).length - 1;
  const css = it.css.split(FONT_FROM).join(FONT_TO);
  if (css.includes('sourcesanspro')) throw new Error(`stray sourcesanspro in ${it.section}`);
  const dir = join(OUT, it.board);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${route}.html`), html);
  writeFileSync(join(dir, `${route}.css`), css);
  if (it.board === 'library') lib[route] = { html, css };
  log.items.push({
    board: it.board, section: it.section, route, shapeId: it.id,
    htmlBytesBefore: it.html.length, htmlBytesAfter: html.length,
    cssBytes: css.length, fontFamilyReplacements: fontCount,
    ...l,
  });
}

// route `button` = Primary + Secondary main components side by side (library board)
const btnHtml = lib['button-primary'].html + lib['button-secondary'].html;
const btnCss = lib['button-primary'].css + '\n' + lib['button-secondary'].css;
writeFileSync(join(OUT, 'library', 'button.html'), btnHtml);
writeFileSync(join(OUT, 'library', 'button.css'), btnCss);

const totals = log.items.reduce(
  (a, i) => ({
    before: a.before + i.elementsBefore, after: a.after + i.elementsAfter,
    removedTop: a.removedTop + i.removedCount, fontReplacements: a.fontReplacements + i.fontFamilyReplacements,
  }),
  { before: 0, after: 0, removedTop: 0, fontReplacements: 0 },
);
log.totals = totals;
writeFileSync(join(OUT, 'dedupe-log.json'), JSON.stringify(log, null, 2) + '\n');
for (const i of log.items) {
  console.log(`${i.board.padEnd(8)} ${i.route.padEnd(16)} elements ${String(i.elementsBefore).padStart(4)} -> ${String(i.elementsAfter).padStart(4)}  removed top-level ${i.removedCount}`);
}
console.log('totals', totals);
