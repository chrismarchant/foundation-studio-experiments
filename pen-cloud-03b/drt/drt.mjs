#!/usr/bin/env node
// Design Reconciliation Test (DRT) for PEN-CLOUD-03-B revision R4.
// Plain ESM, Node >= 22, no dependencies. Reads the accepted DSC r4, DSC r3, the original and corrected Penpot
// observations, the reconciliation diff and the SAC; writes drt-report.json and drt-report.md next to this file.
// Deterministic: no clock, no randomness, no absolute paths in the output.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const INPUTS = {
  dscR4: 'inputs/dsc/fs.ds.relume-default.r4.json',
  dscR3: 'inputs/dsc/fs.ds.relume-default.r3.json',
  orig: 'inputs/penpot/structure.json',
  corr: 'inputs/penpot/structure.r4.json',
  recon: 'inputs/penpot/reconciliation-r4.json',
  sac: 'inputs/sac/landing-sac.json',
};
const raw = {};
const J = {};
for (const [k, p] of Object.entries(INPUTS)) {
  raw[k] = readFileSync(resolve(ROOT, p));
  J[k] = JSON.parse(raw[k].toString('utf8'));
}
const { dscR4: D4, dscR3: D3, orig: O, corr: C, recon: R, sac: S } = J;

// ---------------------------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------------------------
const EPS = 1e-6; // numeric equality (capture float noise is ~1e-12)
const TOL = 0.01; // arithmetic / rounding tolerance for derived geometry
// The original capture rounds some geometry to 0.1 (for example 383.3 vs 383.3333); the smallest real correction in
// the data is 0.4 px (hero image heights), so differences up to 0.05 are capture precision, not design changes.
const ROUND_TOL = 0.05;
const isNum = (v) => typeof v === 'number';
const near = (a, b, t = TOL) => isNum(a) && isNum(b) && Math.abs(a - b) <= t;
function deepEq(a, b, t = EPS) {
  if (isNum(a) && isNum(b)) return Math.abs(a - b) <= t;
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEq(v, b[i], t));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => deepEq(a[k], b[k], t));
  }
  return false;
}
const r2 = (v) => (isNum(v) ? Math.round(v * 100) / 100 : v);
const fmt = (v) => (isNum(v) ? String(r2(v)) : JSON.stringify(v));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const px = (s) => parseFloat(String(s));
const uniq = (a) => [...new Set(a)];
const REC = 'foundation.reconciliation';
const IDN = 'foundation.identity';
const SEM = 'foundation.semantic';
const TIERS = [
  { key: 'desktop', bp: 'lg' },
  { key: 'tablet', bp: 'md' },
  { key: 'mobile', bp: 'sm' },
];

// ---------------------------------------------------------------------------------------------------------------
// flatten a structure file into id -> record
// ---------------------------------------------------------------------------------------------------------------
function flatten(struct) {
  const map = new Map();
  const order = [];
  const walk = (node, parentId, tier, anc) => {
    const r = { id: node.id, node, parentId, tier, anc, kids: (node.k || []).map((k) => k.id) };
    map.set(node.id, r);
    order.push(node.id);
    for (const k of node.k || []) walk(k, node.id, tier, [...anc, node.id]);
  };
  for (const t of TIERS) {
    const b = struct.boards[t.key];
    for (const s of b.sections) walk(s, b.id, t.key, []);
  }
  return { map, order };
}
const FO = flatten(O);
const FN = flatten(C);

function findFirst(node, name) {
  for (const k of node.k || []) {
    if (k.n === name) return k;
    const r = findFirst(k, name);
    if (r) return r;
  }
  return null;
}
function findAll(node, pred, out = []) {
  for (const k of node.k || []) {
    if (pred(k)) out.push(k);
    findAll(k, pred, out);
  }
  return out;
}
const rec = (id) => FN.map.get(id);
const origNode = (id) => FO.map.get(id)?.node;
const recordOf = (node) => node?.pd?.[REC] ?? null;

// ---------------------------------------------------------------------------------------------------------------
// DSC-derived expectations
// ---------------------------------------------------------------------------------------------------------------
const dscComp = (id) => D4.components.find((c) => c.id === id);
const dscTok = (id) => D4.tokens.entries.find((t) => t.id === id);
const bpById = (id) => D4.breakpoints.find((b) => b.id === id);
const SEC_SLUGS = D4.components.filter((c) => c.kind === 'section').map((c) => c.id.replace('fs.section.', ''));
const SEC = {}; // slug -> tier -> section node (resolved through the DSC external.penpot ids)
for (const slug of SEC_SLUGS) {
  SEC[slug] = {};
  const c = dscComp(`fs.section.${slug}`);
  for (const t of TIERS) {
    const r = rec(c.external.penpot[t.key]);
    SEC[slug][t.key] = r && r.tier === t.key ? r.node : null;
  }
}
const textMax = px(dscTok('fs.token.size.text-column.max').value); // 768
const tierGeom = {};
for (const t of TIERS) {
  const bp = bpById(t.bp);
  const pct = px(bp.sidePadding) / 100;
  const derivedContainer = bp.canvas * (1 - 2 * pct);
  tierGeom[t.key] = {
    canvas: bp.canvas,
    pct,
    inset: bp.canvas * pct,
    dscContainer: bp.container,
    derivedContainer,
    // tablet container is derived from canvas and sidePadding (691.2); desktop (1280, screens-governed) and
    // mobile (337) use the DSC breakpoint value
    container: t.key === 'tablet' ? derivedContainer : bp.container,
  };
}
const textColSections = D4.components
  .filter((c) => c.kind === 'section' && (c.bindings || []).some((b) => b.property === 'textColumnMaxWidth'))
  .map((c) => c.id.replace('fs.section.', ''));
const TEXT_COL_NAME = { hero: 'HeroText', features: 'Header', testimonials: 'Header', cta: 'Container' };
const textColNode = (slug, tier) => {
  const sec = SEC[slug][tier];
  if (!sec) return null;
  return slug === 'cta' ? (sec.k || []).find((k) => k.n === 'Container') : findFirst(sec, TEXT_COL_NAME[slug]);
};

// ---------------------------------------------------------------------------------------------------------------
// node comparison (original vs corrected), normalising capture-representation differences
// ---------------------------------------------------------------------------------------------------------------
function normStroke(s) {
  if (s == null) return null;
  if (Array.isArray(s) && s.length && typeof s[0] === 'string') return [{ c: s[0], a: s[2] }];
  return s.map((e) => ({ c: e.c, a: e.a }));
}
function normText(t) {
  if (!t) return null;
  const { align: _align, ...rest } = t; // `align` is absent from every corrected text node; see schema deltas
  return rest;
}
function normComp(c) {
  if (!c) return null;
  return { id: c.id, main: c.main }; // component display names differ in representation only
}
function pdNoRec(pd) {
  if (!pd) return null;
  const { [REC]: _r, ...rest } = pd;
  return Object.keys(rest).length ? rest : null;
}
const PROPS = ['n', 't', 'x', 'y', 'w', 'h', 'flex', 'child', 'fill', 'opacity', 'clip', 'stroke', 'tokens', 'text', 'component', 'pd'];
function view(n) {
  return {
    n: n.n, t: n.t, x: n.x, y: n.y, w: n.w, h: n.h,
    flex: n.flex ?? null, child: n.child ?? null, fill: n.fill ?? null, opacity: n.opacity ?? null, clip: n.clip ?? null,
    stroke: normStroke(n.stroke), tokens: n.tokens ?? null, text: normText(n.text), component: normComp(n.component), pd: pdNoRec(n.pd),
  };
}
function diffProps(a, b) {
  const va = view(a);
  const vb = view(b);
  return PROPS.filter((p) => !deepEq(va[p], vb[p], ROUND_TOL));
}
// classify a node whose normalised diff is empty: identical, float noise (< 1e-6) or capture rounding (< 0.05)
function precisionClass(a, b) {
  const va = view(a);
  const vb = view(b);
  if (PROPS.every((p) => JSON.stringify(va[p]) === JSON.stringify(vb[p]))) return 'identical';
  return PROPS.every((p) => deepEq(va[p], vb[p], EPS)) ? 'float' : 'rounding';
}

const compressIds = (ids) => {
  const groups = new Map();
  for (const id of ids) {
    const m = /^(.*)\.(desktop|tablet|mobile)$/.exec(id);
    const base = m ? m[1] : id;
    if (!groups.has(base)) groups.set(base, []);
    if (m) groups.get(base).push(m[2]);
  }
  return [...groups].map(([b, t]) => (t.length ? `${b}.{${t.join(',')}}` : b));
};

// ---------------------------------------------------------------------------------------------------------------
// result containers
// ---------------------------------------------------------------------------------------------------------------
const checks = []; // {id, group, title, status, detail, ...}
const notes = []; // {id, title, detail}
function add(id, group, title, ok, detail, extra = {}) {
  checks.push({ id, group, title, status: ok ? 'PASS' : 'FAIL', detail, ...extra });
}

// ===============================================================================================================
// A. IDENTITY PRESERVATION
// ===============================================================================================================
const identOrig = FO.order.filter((id) => FO.map.get(id).node.pd?.[IDN]);
{
  const rows = [];
  for (const id of identOrig) {
    const a = FO.map.get(id);
    const b = FN.map.get(id);
    const idOrig = a.node.pd[IDN];
    const idCorr = b?.node.pd?.[IDN];
    const same = !!idCorr && JSON.stringify(idOrig) === JSON.stringify(idCorr);
    const sameParent = !!b && a.parentId === b.parentId && a.tier === b.tier;
    const dscOk = (() => {
      const m = /^fs\.section\.([a-z]+)\.(desktop|tablet|mobile)$/.exec(idOrig.logicalId);
      if (!m) return false;
      const c = dscComp(`fs.section.${m[1]}`);
      return !!c && c.external.penpot[m[2]] === id && m[2] === a.tier;
    })();
    const shapeOk = idOrig.external?.penpot?.shapeId === id && idOrig.external?.penpot?.fileId === O.fileId && idOrig.external?.penpot?.pageId === C.pageId;
    rows.push({ id, logicalId: idOrig.logicalId, name: a.node.n, tier: a.tier, identical: same, sameParent, parent: a.parentId, dscExternalMatch: dscOk, shapeFilePageMatch: shapeOk });
  }
  const bad = rows.filter((r) => !r.identical || !r.sameParent);
  add('A1', 'A', 'Section identity JSON identical (original vs corrected), same node id, same parent board',
    identOrig.length === 15 && bad.length === 0,
    `${rows.filter((r) => r.identical && r.sameParent).length}/${identOrig.length} nodes carrying ${IDN} are byte-identical with the same parent board` +
      (identOrig.length !== 15 ? ` (expected 15, found ${identOrig.length})` : ''),
    { rows, failing: bad.map((r) => r.id) });
  const dscBad = rows.filter((r) => !r.dscExternalMatch);
  add('A1b', 'A', 'Section identity logicalId resolves to the DSC r4 component external.penpot id for its tier',
    dscBad.length === 0, `${rows.length - dscBad.length}/${rows.length} section logicalIds match the DSC components' external.penpot.{desktop,tablet,mobile}`, { failing: dscBad.map((r) => r.id) });
  const shBad = rows.filter((r) => !r.shapeFilePageMatch);
  add('A1c', 'A', 'Identity external.penpot (shapeId, fileId, pageId) agrees with node id, structure fileId and corrected pageId',
    shBad.length === 0, `${rows.length - shBad.length}/${rows.length} agree`, { failing: shBad.map((r) => r.id) });
}

// A2 button mains
{
  const mains = C.buttonMains || [];
  const rows = ['fs.component.button.primary', 'fs.component.button.secondary'].map((lid) => {
    const comp = dscComp(lid);
    const main = mains.find((m) => m.pd?.[IDN]?.logicalId === lid);
    const idv = main?.pd?.[IDN];
    return {
      logicalId: lid,
      mainShapeId: comp.external.penpot.mainShapeId,
      observedId: main?.id ?? null,
      idMatchesDsc: main?.id === comp.external.penpot.mainShapeId,
      identityShapeIdMatches: idv?.external?.penpot?.shapeId === main?.id,
      identityPresent: !!idv,
      componentIdMatchesDsc: main?.component?.id === comp.external.penpot.componentId && main?.component?.main === true,
    };
  });
  const ok = mains.length === 2 && rows.every((r) => r.identityPresent && r.idMatchesDsc && r.identityShapeIdMatches && r.componentIdMatchesDsc);
  add('A2', 'A', 'Button mains carry foundation.identity logicalIds primary/secondary and their ids match DSC external.penpot.mainShapeId',
    ok, `${mains.length} mains in buttonMains; ` + rows.map((r) => `${r.logicalId} -> ${r.observedId ? r.observedId.slice(-12) : 'MISSING'} (id==DSC mainShapeId: ${r.idMatchesDsc}, identity shapeId==id: ${r.identityShapeIdMatches}, component==DSC: ${r.componentIdMatchesDsc})`).join('; '),
    { rows });
  const rm = R.buttonMains || [];
  add('A2b', 'A', 'buttonMains in reconciliation-r4.json agree with structure.r4.json (ids, size, identity)',
    rm.length === mains.length && mains.every((m, i) => rm[i]?.id === m.id && deepEq(rm[i].w, m.w) && deepEq(rm[i].h, m.h) && JSON.stringify(rm[i].pd?.[IDN]) === JSON.stringify(m.pd?.[IDN])),
    `${rm.length} entries compared`);
}

// A2c button instances reference the DSC component ids
const BTN_NAMES = { 'Button / Primary': 'fs.component.button.primary', 'Button / Secondary': 'fs.component.button.secondary' };
const buttonInstances = []; // corrected structure
for (const id of FN.order) {
  const nd = FN.map.get(id).node;
  if (BTN_NAMES[nd.n] && nd.t === 'board') buttonInstances.push(FN.map.get(id));
}
{
  const bad = buttonInstances.filter((r) => r.node.component?.id !== dscComp(BTN_NAMES[r.node.n]).external.penpot.componentId || r.node.component?.main !== false);
  add('A2c', 'A', 'Every Button / Primary and Button / Secondary instance references the DSC component id of its variant',
    bad.length === 0, `${buttonInstances.length - bad.length}/${buttonInstances.length} instances reference external.penpot.componentId of the matching DSC component`, { failing: bad.map((r) => r.id) });
}

// A3 SAC annotations still resolve
{
  const rows = [];
  for (const a of S.annotations) {
    const r = FN.map.get(a.penpotId);
    const nameOk = !!r && r.node.n === a.name;
    const typeOk = !!r && r.node.t === a.type;
    const sem = r?.node.pd?.[SEM];
    const semOk = !!sem && sem.logicalId === a.logicalId && sem.role === a.role && sem.penpotId === a.penpotId;
    rows.push({ penpotId: a.penpotId, logicalId: a.logicalId, name: a.name, resolves: !!r, nameOk, typeOk, semanticAgrees: semOk });
  }
  const bad = rows.filter((r) => !r.resolves || !r.nameOk);
  add('A3', 'A', 'Every SAC annotation penpotId resolves to a corrected-structure node with the same name',
    bad.length === 0, `${rows.length - bad.length}/${rows.length} annotations resolve with identical node name`, { failing: bad.map((r) => r.penpotId) });
  const badSem = rows.filter((r) => !r.typeOk || !r.semanticAgrees);
  add('A3b', 'A', 'SAC annotation type, role and logicalId agree with the corrected node type and its foundation.semantic plugin data',
    badSem.length === 0, `${rows.length - badSem.length}/${rows.length} agree`, { failing: badSem.map((r) => r.penpotId) });
}

// A4 reconciliation records vs plugin data
let pageOffsets = {};
const recNodes = FN.order.filter((id) => recordOf(FN.map.get(id).node));
const mainsWithRec = (C.buttonMains || []).filter((m) => recordOf(m));
{
  const rows = recNodes.map((id) => {
    const a = FO.map.get(id)?.node;
    const b = FN.map.get(id).node;
    const lost = [];
    for (const key of [IDN, SEM]) {
      if (a?.pd?.[key] && JSON.stringify(a.pd[key]) !== JSON.stringify(b.pd?.[key])) lost.push(key);
    }
    const restEq = deepEq(pdNoRec(a?.pd), pdNoRec(b.pd), 0);
    return { id, name: b.n, tier: FN.map.get(id).tier, item: recordOf(b).item, hadIdentity: !!a?.pd?.[IDN], hadSemantic: !!a?.pd?.[SEM], lost, pdMinusRecordEqual: restEq };
  });
  const bad = rows.filter((r) => r.lost.length || !r.pdMinusRecordEqual);
  add('A4', 'A', 'Nodes with foundation.reconciliation records keep foundation.identity / foundation.semantic (pd minus the reconciliation key identical to original)',
    bad.length === 0,
    `${rows.length} board nodes carry a ${REC} record (+${mainsWithRec.length} button mains in buttonMains = ${rows.length + mainsWithRec.length} total); ` +
      `${rows.filter((r) => r.hadIdentity).length} of them had ${IDN} and ${rows.filter((r) => r.hadSemantic).length} had ${SEM} plugin data in the original (the 15 identity sections and the semantic anchors are not directly corrected); ${bad.length} lost or changed any plugin data`,
    { count: rows.length, countWithMains: rows.length + mainsWithRec.length, rows, failing: bad.map((r) => r.id) });
  // the corrected objects carry no identity of their own; each resolves to its enclosing Foundation section
  const enclosing = (id) => {
    const r = FN.map.get(id);
    for (const aid of [...r.anc].reverse()) { const idv = FN.map.get(aid).node.pd?.[IDN]; if (idv) return { id: aid, logicalId: idv.logicalId, identical: JSON.stringify(idv) === JSON.stringify(FO.map.get(aid)?.node.pd?.[IDN]) }; }
    return null;
  };
  const itemSlugs = { 'R4-01': textColSections, 'R4-03': ['testimonials'], 'R4-04': ['hero'], 'R4-05': ['testimonials'] };
  const encRows = recNodes.map((id) => {
    const e = enclosing(id);
    const item = (recordOf(FN.map.get(id).node).item.match(/^R4-0\d/) || [''])[0];
    const slug = e ? (/^fs\.section\.([a-z]+)\./.exec(e.logicalId) || [])[1] : null;
    return { id, name: FN.map.get(id).node.n, item, tier: FN.map.get(id).tier, enclosing: e?.logicalId ?? null, enclosingIdentical: !!e?.identical, slugMatchesItem: !!slug && (itemSlugs[item] || []).includes(slug) };
  });
  const encBad = encRows.filter((r) => !r.enclosing || !r.enclosingIdentical || !r.slugMatchesItem);
  const encIds = uniq(encRows.map((r) => r.enclosing)).sort();
  add('A4b', 'A', 'Every directly corrected node resolves to an enclosing Foundation section whose identity is unchanged and whose DSC component matches the correction item',
    encBad.length === 0, `${encRows.length - encBad.length}/${encRows.length} corrected nodes sit inside an identity-bearing section with identical identity; sections touched: ${compressIds(encIds).join(', ')}. The directly corrected nodes themselves carry no plugin data in the original (identity and semantic live on the sections and on the semantic anchors that were only moved or resized).`,
    { rows: encRows, failing: encBad.map((r) => r.id), sections: encIds });
  const allBad = [];
  let compared = 0;
  for (const id of FO.order) {
    compared++;
    if (!deepEq(pdNoRec(FO.map.get(id).node.pd), pdNoRec(FN.map.get(id)?.node.pd), 0)) allBad.push(id);
  }
  add('A4c', 'A', 'No node anywhere lost or altered plugin data (pd minus reconciliation key, all nodes)',
    allBad.length === 0, `${compared} nodes compared; ${allBad.length} differ`, { failing: allBad });
  // record x values are page-absolute (the tablet and mobile boards sit at x offsets on the page); structure x is
  // board-relative, so derive the offset per tier from the first record and require it to be constant
  const inc = [];
  const offs = {};
  for (const id of recNodes) {
    const rn = FN.map.get(id);
    const a = FO.map.get(id).node;
    const rcd = recordOf(rn.node);
    if (!(rn.tier in offs) && rcd.before && 'x' in rcd.before) offs[rn.tier] = rcd.before.x - a.x;
  }
  for (const id of recNodes) {
    const rn = FN.map.get(id);
    const b = rn.node;
    const a = FO.map.get(id).node;
    const rcd = recordOf(b);
    const off = offs[rn.tier] ?? 0;
    for (const k of ['x', 'y', 'w', 'h']) {
      const o = k === 'x' ? off : 0;
      if (rcd.before && k in rcd.before && !near(rcd.before[k], a[k] + o, ROUND_TOL)) inc.push({ id, field: `before.${k}`, record: rcd.before[k], observed: a[k] + o });
      if (rcd.after && k in rcd.after && !near(rcd.after[k], b[k] + o, ROUND_TOL)) inc.push({ id, field: `after.${k}`, record: rcd.after[k], observed: b[k] + o });
    }
  }
  pageOffsets = offs;
  add('R1', 'R', 'Record fidelity: reconciliation record before/after x, y, w, h agree with the original and corrected observations (board nodes)',
    inc.length === 0, `${recNodes.length} records checked, ${inc.length} field mismatches (record x is page-absolute: tier offsets ${JSON.stringify(offs)})`, { mismatches: inc, pageOffsets: offs });
  const mi = [];
  for (const m of mainsWithRec) {
    const rcd = recordOf(m);
    const obs = { w: m.w, h: m.h, pt: m.flex.pad[0], pb: m.flex.pad[2], pl: m.flex.pad[3], pr: m.flex.pad[1] };
    for (const k of Object.keys(rcd.after)) if (!near(rcd.after[k], obs[k], 0.05)) mi.push({ id: m.id, name: m.n, field: `after.${k}`, record: rcd.after[k], observed: obs[k] });
  }
  add('R2', 'R', 'Record fidelity: button-main reconciliation record `after` size and padding agree with the observed corrected main',
    mi.length === 0, mi.length ? `${mi.length} mismatches: ` + mi.map((x) => `${x.name} ${x.field} record ${x.record} vs observed ${x.observed}`).join('; ') : 'all agree', { mismatches: mi });
}

// ===============================================================================================================
// B. AGREEMENT WITH DSC R4
// ===============================================================================================================
const items = {}; // per R4 item, for the compact table

// ---- B1 text columns -------------------------------------------------------------------------------------------
{
  const rows = [];
  for (const slug of textColSections) {
    for (const t of TIERS) {
      const nd = textColNode(slug, t.key);
      const before = nd ? origNode(nd.id) : null;
      const expected = Math.min(textMax, tierGeom[t.key].container);
      const tolerance = t.key === 'tablet' ? 0.01 : 0.5;
      rows.push({
        section: SEC[slug][t.key]?.pd?.[IDN]?.logicalId, slug, tier: t.key, node: nd?.n, id: nd?.id, before: before?.w, after: nd?.w, expected,
        record: !!recordOf(nd), expectsRecord: t.key !== 'mobile',
        ok: !!nd && near(nd.w, expected, tolerance) && (t.key === 'mobile' ? near(nd.w, before.w, EPS) && !recordOf(nd) : !!recordOf(nd)),
      });
    }
  }
  const bad = rows.filter((r) => !r.ok);
  add('B1', 'B', 'DSC-R4-01 text columns: desktop = text-column.max (768), tablet = tier container (691.2), mobile unchanged = container (337)',
    rows.length === 12 && bad.length === 0,
    `${rows.length - bad.length}/${rows.length} section x tier columns agree (expected ${TIERS.map((t) => r2(Math.min(textMax, tierGeom[t.key].container))).join(' / ')} for desktop / tablet / mobile)`,
    { rows, failing: bad.map((r) => `${r.slug}.${r.tier}`) });
  items['R4-01'] = { rows };
}

// ---- B2 buttons ------------------------------------------------------------------------------------------------
{
  const mains = C.buttonMains || [];
  const rows = [];
  const insts = [];
  for (const lid of ['fs.component.button.primary', 'fs.component.button.secondary']) {
    const comp = dscComp(lid);
    const g = comp.geometry;
    const main = mains.find((m) => m.id === comp.external.penpot.mainShapeId);
    const label = main ? findFirst(main, 'Label') : null;
    const expH = g.height;
    const expW = (label?.w ?? NaN) + 2 * g.paddingX + 2 * g.strokeWidth;
    const ruleH = 2 * g.paddingY + g.labelLineHeight + 2 * g.strokeWidth;
    const expPad = [g.paddingY + g.strokeWidth, g.paddingX + g.strokeWidth, g.paddingY + g.strokeWidth, g.paddingX + g.strokeWidth];
    rows.push({
      logicalId: lid, mainId: main?.id, labelWidth: label?.w, labelHeight: label?.h, expectedHeight: expH, observedHeight: main?.h, expectedWidth: expW, observedWidth: main?.w,
      sizingRuleHeight: ruleH, padding: main?.flex.pad, paddingExpected: expPad,
      ok: !!main && near(main.h, expH, EPS) && near(main.w, expW, EPS) && ruleH === expH && deepEq(main.flex.pad, expPad) && near(label.h, g.labelLineHeight, EPS),
    });
  }
  for (const r of buttonInstances) {
    const g = dscComp(BTN_NAMES[r.node.n]).geometry;
    const o = origNode(r.id);
    insts.push({ id: r.id, tier: r.tier, name: r.node.n, beforeH: o.h, beforeW: o.w, afterH: r.node.h, afterW: r.node.w, ok: near(r.node.h, g.height, EPS) });
  }
  const badI = insts.filter((x) => !x.ok);
  const badM = rows.filter((x) => !x.ok);
  const byTier = TIERS.map((t) => `${t.key} ${insts.filter((x) => x.tier === t.key).length}`).join(', ');
  add('B2a', 'B', 'DSC-R4-02 button mains: height = geometry.height (50), width = label + 2 x paddingX + 2 x strokeWidth (97)',
    badM.length === 0, rows.map((r) => `${r.logicalId.split('.').pop()}: ${r.observedWidth}x${r.observedHeight} (expected ${r.expectedWidth}x${r.expectedHeight}, label ${r.labelWidth})`).join('; '), { rows, failing: badM.map((r) => r.logicalId) });
  add('B2b', 'B', 'DSC-R4-02 every Button / Primary and Button / Secondary instance is geometry.height (50) tall',
    insts.length > 0 && badI.length === 0, `${insts.length - badI.length}/${insts.length} instances are 50 tall (${byTier}); widths ${uniq(insts.map((x) => r2(x.afterW))).join(',')}; original heights ${uniq(insts.map((x) => x.beforeH)).join(',')}`, { instances: insts, failing: badI.map((x) => x.id) });
  items['R4-02'] = { rows, insts };
}

// ---- B3 quote cards --------------------------------------------------------------------------------------------
{
  const qc = dscComp('fs.section.testimonials').layout.quoteCard;
  const tokVal = (id) => px(dscTok(id).value);
  const smStars = tokVal(qc.starsGapBelow.sm);
  const smQuote = tokVal(qc.quoteGapBelow.sm);
  const mdStars = tokVal(qc.starsGapBelow.md);
  const mdQuote = tokVal(qc.quoteGapBelow.md);
  const au = qc.author.sm;
  const expGap = px(au.gap);
  const rows = [];
  const cards = (tier) => findAll(SEC.testimonials[tier], (n) => n.n === 'QuoteCard');
  for (const q of cards('mobile')) {
    const spaces = (q.k || []).filter((k) => k.n === 'Space');
    const author = (q.k || []).find((k) => k.n === 'Author');
    const avatar = findFirst(author, 'Avatar');
    const nameBlock = findFirst(author, 'NameBlock');
    const seq = (q.k || []).map((k) => k.n).join('>');
    const o = origNode(q.id);
    const oSp = (o.k || []).filter((k) => k.n === 'Space');
    const oAu = (o.k || []).find((k) => k.n === 'Author');
    const checksQ = {
      sequence: seq === 'Stars>Space>Quote>Space>Author',
      spaceAfterStars: !!spaces[0] && near(spaces[0].h, smStars, EPS),
      spaceAfterQuote: !!spaces[1] && near(spaces[1].h, smQuote, EPS),
      authorDir: author.flex.dir === au.direction,
      authorGap: deepEq(author.flex.gap, [expGap, expGap]),
      authorAi: author.flex.ai === au.align,
      authorHeight: near(author.h, avatar.h + nameBlock.h, EPS),
    };
    rows.push({
      tier: 'mobile', id: q.id, spaceIds: spaces.map((s) => s.id), authorId: author.id,
      before: { spaceH: oSp.map((s) => s.h), authorDir: oAu.flex.dir, authorGap: oAu.flex.gap, authorAi: oAu.flex.ai, authorH: oAu.h },
      after: { spaceH: spaces.map((s) => s.h), authorDir: author.flex.dir, authorGap: author.flex.gap, authorAi: author.flex.ai, authorH: author.h, avatarH: avatar.h, nameBlockH: nameBlock.h },
      expected: { starsGap: smStars, quoteGap: smQuote, authorDir: au.direction, authorGap: [expGap, expGap], authorAi: au.align, authorH: avatar.h + nameBlock.h },
      checks: checksQ, ok: Object.values(checksQ).every(Boolean) && spaces.length === 2,
    });
  }
  // relative-geometry signature of a card subtree (offsets from the card origin, plugin data ignored)
  const sig = (n, root) => {
    const v = view(n);
    return { ...v, x: n.x - root.x, y: n.y - root.y, pd: null, k: (n.k || []).map((c) => sig(c, root)) };
  };
  const ctrl = [];
  for (const tier of ['tablet', 'desktop']) {
    for (const q of cards(tier)) {
      const o = origNode(q.id);
      const unchanged = deepEq(sig(q, q), sig(o, o), EPS) && !JSON.stringify(q).includes(REC);
      const spaces = (q.k || []).filter((k) => k.n === 'Space');
      const author = (q.k || []).find((k) => k.n === 'Author');
      const dscMdOk = spaces.length === 2 && near(spaces[0].h, mdStars, EPS) && near(spaces[1].h, mdQuote, EPS) && author.flex.dir === qc.author.md.direction && author.flex.ai === qc.author.md.align;
      ctrl.push({ tier, id: q.id, unchangedVsOriginal: unchanged, matchesDscMdTier: dscMdOk, ok: unchanged && dscMdOk });
    }
  }
  const bad = rows.filter((r) => !r.ok);
  const badC = ctrl.filter((r) => !r.ok);
  add('B3a', 'B', 'DSC-R4-03 mobile QuoteCards: Space children = gap.5 (20), Author column / gap [0,0] / ai start, Author height = Avatar + NameBlock (104)',
    rows.length === 2 && bad.length === 0,
    `${rows.length - bad.length}/${rows.length} mobile QuoteCards agree (Space ${rows.map((r) => r.after.spaceH.join('/')).join(' | ')}; Author ${rows.map((r) => `${r.after.authorDir}/${r.after.authorAi}/${JSON.stringify(r.after.authorGap)}/h${r.after.authorH}`).join(' | ')})`,
    { rows, failing: bad.map((r) => r.id) });
  add('B3b', 'B', 'DSC-R4-03 tablet and desktop QuoteCards unchanged from the original (relative geometry, spacing, flex) and consistent with the DSC md tier',
    ctrl.length === 4 && badC.length === 0, `${ctrl.length - badC.length}/${ctrl.length} tablet/desktop quote cards unchanged (Space ${mdStars}/${mdQuote}, row / center author)`, { rows: ctrl, failing: badC.map((r) => r.id) });
  items['R4-03'] = { rows, ctrl };
}

// ---- B4 hero images --------------------------------------------------------------------------------------------
{
  const il = dscComp('fs.section.hero').interaction.imageLayout;
  const aspect = px(/\[(\d+(?:\.\d+)?)%\]/.exec(il.aspect)[1]) / 100; // 1.2
  const minVw = px(/(\d+(?:\.\d+)?)vw/.exec(il.minHeightBelowScreen.value)[1]) / 100; // 0.35
  const minScreen = D4.screens.find((s) => s.id === il.minHeightBelowScreen.screen).minWidth; // sm: 480
  const vwOf = (entry, tier) => {
    const base = /(?:^|\s)w-\[(\d+(?:\.\d+)?)vw\]/.exec(entry);
    const md = /md:w-\[(\d+(?:\.\d+)?)vw\]/.exec(entry);
    const lg = /lg:w-\[(\d+(?:\.\d+)?)vw\]/.exec(entry);
    return px((tier === 'desktop' ? lg : tier === 'tablet' ? md : base)[1]);
  };
  const rows = [];
  for (const t of TIERS) {
    const sec = SEC.hero[t.key];
    const W = C.boards[t.key].w;
    const inset = W * tierGeom[t.key].pct;
    const mobileRule = tierGeom[t.key].canvas < minScreen;
    const cols = { left: findFirst(sec, 'ImagesLeft'), right: findFirst(sec, 'ImagesRight') };
    for (const side of ['left', 'right']) {
      const imgs = cols[side].k;
      const oimgs = imgs.map((i) => origNode(i.id));
      const maxW = Math.max(...imgs.map((i) => i.w));
      const expH = Math.max(aspect * maxW, mobileRule ? minVw * W : 0);
      const dscWide = (vwOf(il[side === 'left' ? 'leftColumn' : 'rightColumn'][0], t.key) / 100) * W;
      const first = imgs[0];
      const edgeOk = side === 'left'
        ? imgs.every((i) => i.x >= inset - EPS) && near(first.x, inset, EPS)
        : imgs.every((i) => i.x + i.w <= W - inset + EPS) && near(first.x + first.w, W - inset, EPS);
      const heightOk = imgs.every((i) => near(i.h, expH, 0.5));
      const widthsOk = imgs.every((i, idx) => near(i.w, oimgs[idx].w, EPS));
      const widestOk = near(maxW, dscWide, 1);
      const recOk = imgs.every((i) => !!recordOf(i));
      rows.push({
        tier: t.key, side, boardWidth: W, inset, images: imgs.map((i) => ({ id: i.id, n: i.n, x: i.x, w: i.w, h: i.h, right: i.x + i.w, beforeX: origNode(i.id).x, beforeH: origNode(i.id).h })),
        widest: maxW, dscWidest: dscWide, expectedHeight: expH, mobileMinRule: mobileRule,
        checks: { edge: edgeOk, height: heightOk, widthsUnchanged: widthsOk, widestMatchesDscVw: widestOk, recorded: recOk },
        ok: edgeOk && heightOk && widthsOk && widestOk && recOk,
      });
    }
  }
  const bad = rows.filter((r) => !r.ok);
  add('B4', 'B', 'DSC-R4-04 hero image columns: inset (5 %), first left image at inset, right column ends at width - inset, one height per column = 1.2 x widest (35vw floor on mobile), widths unchanged',
    bad.length === 0, `${rows.length - bad.length}/${rows.length} tier x column groups agree; insets ${TIERS.map((t) => r2(C.boards[t.key].w * tierGeom[t.key].pct)).join(' / ')}; column heights ${rows.map((r) => `${r.tier[0]}${r.side[0]}=${r2(r.expectedHeight)}`).join(' ')}`,
    { rows, failing: bad.map((r) => `${r.tier}.${r.side}`) });
  items['R4-04'] = { rows };
}

// ---- B5 grid gap -----------------------------------------------------------------------------------------------
{
  const bind = dscComp('fs.section.testimonials').bindings.find((b) => b.property === 'gridGap');
  const tok = dscTok(bind.token); // fs.token.space.grid.gap
  const penpotTokenFor = (value) => D4.tokens.entries.find((e) => e.type === 'spacing' && px(e.value) === value && e.external.penpot)?.external.penpot;
  const rows = [];
  for (const t of TIERS) {
    const expGap = t.key === 'mobile' ? px(tok.responsive.sm) : px(tok.value);
    const expTok = penpotTokenFor(expGap);
    const grid = findFirst(findFirst(SEC.testimonials[t.key], 'Container'), 'Grid');
    const o = origNode(grid.id);
    rows.push({
      tier: t.key, id: grid.id, expectedGap: expGap, expectedTokens: expTok, beforeGap: o.flex.gap, beforeTokens: o.tokens ?? null, afterGap: grid.flex.gap, afterTokens: grid.tokens ?? null,
      ok: deepEq(grid.flex.gap, [expGap, expGap]) && grid.tokens?.rowGap === expTok && grid.tokens?.columnGap === expTok && !!recordOf(grid),
    });
  }
  const bad = rows.filter((r) => !r.ok);
  add('B5', 'B', 'DSC-R4-05 testimonials Grid gap: desktop/tablet [32,32] bound to space.gap.8, mobile [24,24] bound to space.gap.6 (= DSC fs.token.space.grid.gap 32 / sm 24)',
    bad.length === 0, rows.map((r) => `${r.tier}: gap ${JSON.stringify(r.afterGap)} tokens ${r.afterTokens ? r.afterTokens.rowGap : 'none'} (expected ${r.expectedGap}, ${r.expectedTokens})`).join('; '), { rows, failing: bad.map((r) => r.tier) });
  items['R4-05'] = { rows, token: { id: tok.id, value: tok.value, sm: tok.responsive.sm, binding: `fs.section.testimonials.${bind.property}` } };
}

// B0 provenance linkage
{
  const prov = D4.provenance.find((p) => p.kind === 'penpot-reconciliation');
  add('B0', 'B', 'DSC r4 lineage: supersedes the r3 revision; penpot-reconciliation provenance points at structure.r4.json with the same capturedAt',
    D4.supersedes === D3.revision && prov?.capturedAt === C.capturedAt && prov?.correctedStructure === 'inputs/penpot/structure.r4.json' && R.capturedAt === C.capturedAt,
    `supersedes==r3.revision: ${D4.supersedes === D3.revision}; provenance capturedAt ${prov?.capturedAt} vs structure.r4 ${C.capturedAt} vs reconciliation ${R.capturedAt}`);
  add('B0b', 'B', 'DSC r4 tokens used by the checks exist (text-column.max, gap.5, grid.gap) and are new relative to r3',
    ['fs.token.size.text-column.max', 'fs.token.space.gap.5', 'fs.token.space.grid.gap'].every((id) => dscTok(id) && !D3.tokens.entries.some((e) => e.id === id)),
    'three new r4 tokens present in r4 and absent from r3');
}

// ===============================================================================================================
// C. SCOPE CONTROL
// ===============================================================================================================
// C0 structural parity
{
  const missing = FO.order.filter((id) => !FN.map.has(id));
  const added = FN.order.filter((id) => !FO.map.has(id));
  const reparent = FO.order.filter((id) => FN.map.has(id) && FO.map.get(id).parentId !== FN.map.get(id).parentId);
  const reorder = FO.order.filter((id) => FN.map.has(id) && JSON.stringify(FO.map.get(id).kids) !== JSON.stringify(FN.map.get(id).kids));
  const sameBoards = TIERS.every((t) => O.boards[t.key].id === C.boards[t.key].id && O.boards[t.key].w === C.boards[t.key].w);
  add('C0', 'C', 'Node set parity: same node ids, same parents, same child order, same board ids and widths (original vs corrected)',
    !missing.length && !added.length && !reparent.length && !reorder.length && sameBoards && O.fileId === C.fileId,
    `${FO.order.length} original nodes, ${FN.order.length} corrected nodes; missing ${missing.length}, added ${added.length}, re-parented ${reparent.length}, re-ordered ${reorder.length}; fileId ${O.fileId === C.fileId ? 'same' : 'DIFFERENT'}`,
    { missing, added, reparent, reorder });
}

// C1 section stack: gap-free, board height = sum
const boardPseudo = []; // canvas boards, classified as (d)
const stackIssues = [];
for (const t of TIERS) {
  for (const [label, S2] of [['original', O], ['corrected', C]]) {
    const b = S2.boards[t.key];
    let y = 0;
    for (const s of b.sections) {
      if (!near(s.y, y, TOL)) stackIssues.push({ source: label, tier: t.key, section: s.n, y: s.y, expected: y });
      y += s.h;
    }
    if (!near(b.h, y, TOL)) stackIssues.push({ source: label, tier: t.key, section: '(board height)', y: b.h, expected: y });
  }
  const bo = O.boards[t.key];
  const bc = C.boards[t.key];
  boardPseudo.push({ id: bc.id, tier: t.key, name: `board ${t.key}`, before: bo.h, after: bc.h, changed: !near(bo.h, bc.h, EPS) });
}
add('C1', 'C', 'Section stack is gap-free in both structures and each canvas board height equals the sum of its section heights',
  stackIssues.length === 0, `${stackIssues.length} stack inconsistencies`, { issues: stackIssues });

// auto-layout position engine: where the flex arithmetic puts each child of a flex board
function layoutPositions(node) {
  const f = node.flex;
  const kids = node.k || [];
  if (!f || !kids.length) return [];
  const [pt, pr, pb, pl] = f.pad;
  const innerW = node.w - pl - pr;
  const innerH = node.h - pt - pb;
  const col = f.dir === 'column';
  const gap = col ? f.gap[0] : f.gap[1];
  const main = (k) => (col ? k.h : k.w);
  const cross = (k) => (col ? k.w : k.h);
  const innerMain = col ? innerH : innerW;
  const innerCross = col ? innerW : innerH;
  const free = innerMain - kids.reduce((sum, k) => sum + main(k), 0) - gap * (kids.length - 1);
  let pos = 0;
  let g = gap;
  if (f.jc === 'center') pos = free / 2;
  else if (f.jc === 'end') pos = free;
  else if (f.jc === 'space-between' && kids.length > 1) g = gap + free / (kids.length - 1);
  const out = [];
  for (const k of kids) {
    let c = 0;
    if (f.ai === 'center') c = (innerCross - cross(k)) / 2;
    else if (f.ai === 'end') c = innerCross - cross(k);
    out.push({ id: k.id, name: k.n, parent: node.n, x: col ? node.x + pl + c : node.x + pl + pos, y: col ? node.y + pt + pos : node.y + pt + c });
    pos += main(k) + g;
  }
  return out;
}
function layoutAudit(F, tol) {
  const exp = new Map();
  let ok = 0;
  const bad = [];
  for (const id of F.order) {
    const nd = F.map.get(id).node;
    for (const e of layoutPositions(nd)) {
      exp.set(e.id, e);
      const k = F.map.get(e.id).node;
      if (near(k.x, e.x, tol) && near(k.y, e.y, tol)) ok++;
      else bad.push({ id: e.id, name: e.name, parent: e.parent, x: k.x, expectedX: e.x, y: k.y, expectedY: e.y });
    }
  }
  return { exp, ok, bad };
}
const layoutNew = layoutAudit(FN, TOL);
const layoutOld = layoutAudit(FO, 0.11); // the original capture rounds to 0.1
add('C6', 'C', 'Auto-layout position consistency: every child of a flex board in the corrected structure sits where the flex arithmetic puts it (so position cascades are layout-derived)',
  layoutNew.bad.length === 0 && layoutOld.bad.length === 0,
  `corrected structure ${layoutNew.ok}/${layoutNew.ok + layoutNew.bad.length} children at their layout position (tolerance ${TOL}); original structure ${layoutOld.ok}/${layoutOld.ok + layoutOld.bad.length} (tolerance 0.11, capture rounding)`,
  { correctedMismatches: layoutNew.bad, originalMismatches: layoutOld.bad });
const stackY = new Map();
for (const t of TIERS) {
  let y = 0;
  for (const sct of C.boards[t.key].sections) { stackY.set(sct.id, y); y += sct.h; }
}

// classification
const catLabels = {
  a: 'a. direct correction (carries a foundation.reconciliation record)',
  b: 'b. position-only cascade',
  c: 'c. width/height inheritance from a corrected parent, text re-wrap, button instance size',
  d: 'd. container / section / board height (or width) recomputation',
};
const results = []; // per changed node
const diffsById = new Map();
for (const id of FO.order) {
  const a = FO.map.get(id).node;
  const b = FN.map.get(id)?.node;
  if (b) diffsById.set(id, diffProps(a, b));
}
const hasRec = (id) => !!recordOf(FN.map.get(id).node);
const ancHasRec = (id, itemPrefix) => FN.map.get(id).anc.some((aid) => { const r = recordOf(FN.map.get(aid).node); return r && (!itemPrefix || r.item.startsWith(itemPrefix)); });
// expected node sets per item (derived from the structure, not from the records)
const expectedSets = {
  'R4-01': new Set(TIERS.filter((t) => t.key !== 'mobile').flatMap((t) => textColSections.map((s) => textColNode(s, t.key).id))),
  'R4-03': new Set(findAll(SEC.testimonials.mobile, (n) => n.n === 'QuoteCard').flatMap((q) => [q.id, ...(q.k || []).filter((k) => k.n === 'Space' || k.n === 'Author').map((k) => k.id)])),
  'R4-04': new Set(TIERS.flatMap((t) => ['ImagesLeft', 'ImagesRight'].flatMap((c) => findFirst(SEC.hero[t.key], c).k.map((i) => i.id)))),
  'R4-05': new Set(TIERS.map((t) => findFirst(findFirst(SEC.testimonials[t.key], 'Container'), 'Grid').id)),
};
const ALLOWED = { 'R4-01': ['x', 'y', 'w', 'h', 'flex', 'child'], 'R4-03': ['y', 'w', 'h', 'flex'], 'R4-04': ['x', 'y', 'h'], 'R4-05': ['y', 'w', 'h', 'tokens'] };
const itemOf = (id) => (recordOf(FN.map.get(id).node).item.match(/^R4-0\d/) || [''])[0];

// button-instance expectations from the DSC
const btnExpect = (name) => {
  const comp = dscComp(BTN_NAMES[name]);
  const g = comp.geometry;
  const main = (C.buttonMains || []).find((m) => m.id === comp.external.penpot.mainShapeId);
  const label = main ? findFirst(main, 'Label') : null;
  return { h: g.height, w: (label?.w ?? NaN) + 2 * g.paddingX + 2 * g.strokeWidth, pad: [g.paddingY + g.strokeWidth, g.paddingX + g.strokeWidth, g.paddingY + g.strokeWidth, g.paddingX + g.strokeWidth] };
};
// flex arithmetic: expected height / width of an auto-layout board from its (corrected) children
function flexExpected(node) {
  const f = node.flex;
  const kids = node.k || [];
  if (!f || !kids.length) return null;
  if (f.dir === 'column') {
    return {
      h: f.pad[0] + f.pad[2] + kids.reduce((s, c) => s + c.h, 0) + f.gap[0] * (kids.length - 1),
      w: f.pad[1] + f.pad[3] + Math.max(...kids.map((c) => c.w)),
    };
  }
  return {
    h: f.pad[0] + f.pad[2] + Math.max(...kids.map((c) => c.h)),
    w: f.pad[1] + f.pad[3] + kids.reduce((s, c) => s + c.w, 0) + f.gap[1] * (kids.length - 1),
  };
}

let noiseOnly = 0; // float noise (below 1e-6)
let roundingOnly = 0; // capture rounding (below 0.05)
let unchanged = 0;
for (const id of FO.order) {
  const rn = FN.map.get(id);
  if (!rn) continue;
  const a = FO.map.get(id).node;
  const b = rn.node;
  const D = diffsById.get(id);
  const out = { id, tier: rn.tier, name: b.n, type: b.t, changed: D, cat: null, why: '' };
  if (hasRec(id)) {
    const item = itemOf(id);
    const allowed = ALLOWED[item];
    const bad = D.filter((p) => !(allowed || []).includes(p));
    if (!allowed) { out.cat = 'unexplained'; out.why = `reconciliation record with unknown item ${recordOf(b).item}`; }
    else if (bad.length) { out.cat = 'unexplained'; out.why = `direct correction ${item} also changed ${bad.join(',')} (outside the properties that item governs)`; }
    else if (!expectedSets[item].has(id)) { out.cat = 'unexplained'; out.why = `reconciliation record ${item} on a node that is not part of the expected ${item} set`; }
    else { out.cat = 'a'; out.why = recordOf(b).item; }
    out.item = item;
    results.push(out);
    continue;
  }
  if (!D.length) {
    const pc = precisionClass(a, b);
    if (pc === 'float') noiseOnly++; else if (pc === 'rounding') roundingOnly++; else unchanged++;
    continue;
  }
  const parent = rn.parentId && FN.map.get(rn.parentId) ? FN.map.get(rn.parentId).node : null;
  if (D.includes('x') || D.includes('y')) {
    const e = layoutNew.exp.get(id);
    if (e) {
      if (!near(b.x, e.x, TOL) || !near(b.y, e.y, TOL)) {
        out.cat = 'unexplained'; out.why = `position (${r2(b.x)}, ${r2(b.y)}) differs from the auto-layout position (${r2(e.x)}, ${r2(e.y)})`;
        results.push(out);
        continue;
      }
    } else if (rn.anc.length === 0) {
      if (!near(b.x, 0, TOL) || !near(b.y, stackY.get(id), TOL)) {
        out.cat = 'unexplained'; out.why = `section position (${r2(b.x)}, ${r2(b.y)}) differs from the section stack (0, ${r2(stackY.get(id))})`;
        results.push(out);
        continue;
      }
    } else {
      out.cat = 'unexplained'; out.why = 'moved under an absolutely positioned parent without a reconciliation record';
      results.push(out);
      continue;
    }
  }
  const onlyPos = D.every((p) => p === 'x' || p === 'y');
  const isBtn = BTN_NAMES[b.n] && b.t === 'board' && b.component && b.component.main === false;
  if (isBtn && D.some((p) => ['w', 'h', 'flex'].includes(p))) {
    const e = btnExpect(b.n);
    const extra = D.filter((p) => !['x', 'y', 'w', 'h', 'flex'].includes(p));
    if (extra.length) { out.cat = 'unexplained'; out.why = `button instance also changed ${extra.join(',')}`; }
    else if (!near(b.h, e.h, EPS) || !near(b.w, e.w, EPS) || !deepEq(b.flex.pad, e.pad)) { out.cat = 'unexplained'; out.why = `button instance size ${b.w}x${b.h} pad ${JSON.stringify(b.flex.pad)} differs from DSC geometry ${e.w}x${e.h} pad ${JSON.stringify(e.pad)}`; }
    else { out.cat = 'c'; out.why = 'button instance resized to DSC geometry (50 tall) with the main'; }
  } else if (onlyPos) {
    if (D.length === 1 && D[0] === 'y') { out.cat = 'b'; out.why = 'y only'; }
    else {
      const horiz = rn.anc.some((aid) => { const d = diffsById.get(aid) || []; return d.includes('x') || d.includes('w') || d.includes('flex') || hasRec(aid); });
      if (horiz) { out.cat = 'b'; out.why = 'x/y inside a changed ancestor (corrected column/board or resized container)'; }
      else { out.cat = 'unexplained'; out.why = 'x changed but no ancestor changed horizontally'; }
    }
  } else if (D.every((p) => ['x', 'y', 'w', 'h'].includes(p))) {
    const reasons = [];
    let ok = true;
    if (D.includes('w')) {
      const colAnc = rn.anc.map((aid) => FN.map.get(aid).node).reverse().find((n) => recordOf(n));
      if (parent && near(b.w, parent.w, TOL) && (hasRec(parent.id) || (diffsById.get(parent.id) || []).includes('w') || (colAnc && near(b.w, colAnc.w, TOL)))) reasons.push('width equals the corrected parent width');
      else ok = false;
    }
    if (D.includes('h')) {
      if (b.t === 'text' && ancHasRec(id, 'R4-01')) reasons.push('text re-wrap inside a corrected text column');
      else ok = false;
    }
    if (ok) { out.cat = 'c'; out.why = reasons.join('; '); }
    else if (b.t === 'board' && b.flex) {
      const e = flexExpected(b);
      const wrong = [];
      if (D.includes('h') && !near(b.h, e.h, TOL)) wrong.push(`h ${b.h} vs ${r2(e.h)}`);
      if (D.includes('w') && !(b.flex.hs === 'auto' && near(b.w, e.w, TOL))) wrong.push(`w ${b.w} vs ${r2(e.w)} (hs ${b.flex.hs})`);
      if (!wrong.length) { out.cat = 'd'; out.why = 'auto-layout container re-computed from its corrected children'; }
      else { out.cat = 'unexplained'; out.why = `container size not derivable from children: ${wrong.join('; ')}`; }
    } else { out.cat = 'unexplained'; out.why = `${D.join(',')} changed without an inheritance or recomputation cause`; }
  } else {
    out.cat = 'unexplained'; out.why = `changed ${D.join(',')} (properties other than geometry)`;
  }
  results.push(out);
}
// canvas boards (pseudo nodes)
for (const bp of boardPseudo) {
  if (!bp.changed) { unchanged++; continue; }
  const ok = !stackIssues.some((s) => s.tier === bp.tier && s.source === 'corrected');
  results.push({ id: bp.id, tier: bp.tier, name: bp.name, type: 'canvas', changed: ['h'], cat: ok ? 'd' : 'unexplained', why: ok ? `board height = sum of section heights (${r2(bp.after)})` : 'board height does not equal the sum of its sections' });
}

const counts = { a: 0, b: 0, c: 0, d: 0, unexplained: 0 };
for (const r of results) counts[r.cat]++;
const unexplained = results.filter((r) => r.cat === 'unexplained');
const totalChanged = results.length;
add('C2', 'C', 'Every changed node is explained by (a) direct correction, (b) position cascade, (c) inheritance / button instance, or (d) container recomputation',
  unexplained.length === 0,
  `${totalChanged} changed nodes (3 canvas boards included): a=${counts.a} direct, b=${counts.b} position-only, c=${counts.c} inherited, d=${counts.d} recomputed, unexplained=${counts.unexplained}; ${noiseOnly} further nodes differ only by float noise (below 1e-6), ${roundingOnly} only by capture rounding (below ${ROUND_TOL} px) and ${unchanged} are identical`,
  { counts, totalChanged, noiseOnly, roundingOnly, unchanged, unexplained });

// C3 direct-correction sets
{
  const byItem = {};
  for (const id of recNodes) { const it = itemOf(id); (byItem[it] = byItem[it] || []).push(id); }
  const rows = Object.keys(expectedSets).map((it) => {
    const have = new Set(byItem[it] || []);
    const exp = expectedSets[it];
    return { item: it, expected: exp.size, recorded: have.size, missing: [...exp].filter((x) => !have.has(x)), extra: [...have].filter((x) => !exp.has(x)) };
  });
  const unknownItems = Object.keys(byItem).filter((it) => !expectedSets[it]);
  add('C3', 'C', 'Nodes carrying reconciliation records are exactly the expected node sets (text columns, mobile quote-card spacing nodes, hero images, testimonial grids)',
    rows.every((r) => !r.missing.length && !r.extra.length) && !unknownItems.length,
    rows.map((r) => `${r.item}: ${r.recorded}/${r.expected}`).join(', ') + (unknownItems.length ? `; unknown items ${unknownItems.join(',')}` : ''), { rows, unknownItems });
}

// C4 cross-check against reconciliation-r4.json
{
  const mine = new Set(results.filter((r) => r.type !== 'canvas').map((r) => r.id));
  const theirs = new Set(R.changedNodes.map((c) => c.id));
  const onlyMine = [...mine].filter((x) => !theirs.has(x));
  const onlyTheirs = [...theirs].filter((x) => !mine.has(x));
  const theirRecs = R.changedNodes.filter((c) => c.reconciliation).length;
  const identityLost = R.changedNodes.filter((c) => c.identityPreserved !== true).length;
  // nodes the reconciliation file lists but the normalised diff does not: must differ only by text.align there
  const theirsOnlyDetail = onlyTheirs.map((id) => {
    const c = R.changedNodes.find((x) => x.id === id);
    const keys = Object.keys(c.changes);
    const alignOnly = keys.length === 1 && keys[0] === 'text' && deepEq(normText(c.changes.text.before), normText(c.changes.text.after), 0);
    return { id, name: FN.map.get(id)?.node.n, tier: FN.map.get(id)?.tier, changesInFile: keys, alignOnly, normalisedDiffs: diffsById.get(id) };
  });
  const cmp = {
    mineChanged: mine.size, theirChanged: theirs.size, onlyMine, onlyTheirs: theirsOnlyDetail,
    theirDirect: theirRecs, theirIdentityNotPreserved: identityLost, theirSummary: R.summary,
    mineDirect: counts.a, minePositionOnly: counts.b, mineInheritedOrDerived: counts.c + counts.d,
  };
  add('C4', 'C', 'Independent diff agrees with reconciliation-r4.json (changed node ids, count of direct corrections, identityPreserved everywhere)',
    onlyMine.length === 0 && theirRecs === counts.a && identityLost === 0 && R.summary.directCorrections === counts.a && theirsOnlyDetail.every((x) => x.alignOnly),
    `independent diff ${mine.size} nodes vs reconciliation file ${theirs.size}; only in mine ${onlyMine.length}; only in the file ${onlyTheirs.length} (${theirsOnlyDetail.filter((x) => x.alignOnly).length} of them differ only by the dropped text.align); direct corrections ${counts.a} vs ${R.summary.directCorrections}; identityPreserved false on ${identityLost}. File summary ${JSON.stringify(R.summary)}; mine a=${counts.a}, b=${counts.b}, c+d=${counts.c + counts.d} (canvas boards excluded from the file's count)`,
    cmp);
}

// C5 representation (schema) deltas between the two captures: reported, not counted as design changes
const schema = { textAlignDropped: 0, strokeReshaped: 0, componentNameChanged: 0, textNodes: 0 };
for (const id of FO.order) {
  const a = FO.map.get(id).node;
  const b = FN.map.get(id).node;
  if (a.text) { schema.textNodes++; if ('align' in a.text && !('align' in (b.text || {}))) schema.textAlignDropped++; }
  if (Array.isArray(a.stroke) && typeof a.stroke[0] === 'string' && Array.isArray(b.stroke) && typeof b.stroke[0] === 'object') schema.strokeReshaped++;
  if (a.component && b.component && a.component.name !== b.component.name) schema.componentNameChanged++;
}
{
  const strokeDiff = FO.order.filter((id) => !deepEq(normStroke(FO.map.get(id).node.stroke), normStroke(FN.map.get(id).node.stroke))).length;
  add('C5', 'C', 'Capture-representation deltas (text.align, stroke shape, component display name) hide no design change after normalisation',
    strokeDiff === 0,
    `text.align absent on ${schema.textAlignDropped}/${schema.textNodes} corrected text nodes (alignment not verifiable); stroke re-shaped on ${schema.strokeReshaped} nodes (colour and alignment equal after normalisation: ${strokeDiff === 0}); component display name differs on ${schema.componentNameChanged} nodes (component ids equal)`,
    { schema });
}

// ===============================================================================================================
// Notes (observations about the inputs; not PASS/FAIL)
// ===============================================================================================================
{
  const stale = mainsWithRec.filter((m) => !near(recordOf(m).after.w, m.w, 0.05) || !near(recordOf(m).after.h, m.h, 0.05));
  if (stale.length) notes.push({ id: 'N1', title: 'Button-main reconciliation records are stale', detail: `${stale.length} button mains carry ${REC} with after.w/h ${stale.map((m) => `${recordOf(m).after.w}x${recordOf(m).after.h}`).join(', ')} (identical to before) while the observed mains are ${stale.map((m) => `${m.w}x${m.h}`).join(', ')} with padding ${JSON.stringify(stale[0].flex.pad)}; the record captures the padding change but not the resulting size.` });
  notes.push({ id: 'N2', title: 'Corrected capture differs in representation from the original', detail: `structure.r4.json is described as the same schema, but text.align is absent on ${schema.textAlignDropped}/${schema.textNodes} text nodes, stroke is [{w,a,c}] instead of [colour, alpha, align] on ${schema.strokeReshaped} nodes (alpha dropped, width added), and component display names changed on ${schema.componentNameChanged} nodes (e.g. "Button / Button/Primary" -> "Primary"). These were normalised before diffing, so text alignment (for example the centred H1) cannot be verified.` });
  const mdp = tierGeom.tablet;
  notes.push({ id: 'N3', title: 'DSC container values are rounded', detail: `DSC breakpoints md.container = ${mdp.dscContainer} but canvas x (1 - 2 x 5 %) = ${r2(mdp.derivedContainer)}; the Penpot tablet text columns and containers are ${r2(mdp.derivedContainer)} (checks use the derived value). sm.container = ${tierGeom.mobile.dscContainer} vs derived ${r2(tierGeom.mobile.canvas * 0.9)}; the Penpot mobile board uses ${tierGeom.mobile.dscContainer}.` });
  const textCols = TIERS.filter((t) => t.key !== 'mobile').flatMap((t) => textColSections.map((s) => textColNode(s, t.key)));
  const toFix = textCols.filter((n) => origNode(n.id).flex?.vs === 'auto' && n.flex?.vs === 'fix').length;
  notes.push({ id: 'N4', title: 'Corrected text columns switched from hug (vs auto) to fixed height', detail: `${toFix}/${textCols.length} desktop/tablet text-column boards changed flex.vs from auto to fix (and child.vs where present) as part of the direct correction. The DSC does not govern vertical sizing; the heights are the re-wrapped content heights. Recorded for awareness only.` });
  const fg = TIERS.map((t) => {
    const g = findFirst(findFirst(SEC.features[t.key], 'Container'), 'Grid');
    const same = deepEq(origNode(g.id).flex, g.flex) && deepEq(origNode(g.id).tokens ?? null, g.tokens ?? null);
    return `${t.key} gap ${JSON.stringify(g.flex.gap)} tokens ${JSON.stringify(g.tokens ?? null)} (unchanged from original: ${same})`;
  });
  notes.push({ id: 'N5', title: 'Features Grid gap is outside R4-05 and not fully on DSC tokens', detail: `DSC features gridGap stays on fs.token.space.gap.8 (32). Observed, untouched by R4: ${fg.join('; ')}. The desktop columnGap token is named "cd.space.gap-8" (not a DSC-mapped Penpot token name), tablet has no token binding, and mobile is a stacked list with 0 gap.` });
  notes.push({ id: 'N6', title: 'DSC revision', detail: `fs.ds.relume-default.r4.json revision ${D4.revision}; supersedes ${D4.supersedes}.` });
  if (Object.values(pageOffsets).some((v) => v !== 0)) notes.push({ id: 'N8', title: 'Reconciliation record x values are page-absolute', detail: `foundation.reconciliation before/after x are page coordinates (tier offsets ${JSON.stringify(pageOffsets)}), while structure x is board-relative; y, w and h are in the same frame. The record check applies the constant per-tier offset.` });
  {
    const stale2 = recNodes.filter((id) => { const b = FN.map.get(id).node; const rcd = recordOf(b); return rcd.after && 'h' in rcd.after && !near(rcd.after.h, b.h, ROUND_TOL); });
    if (stale2.length) notes.push({ id: 'N9', title: 'Reconciliation record after.h is stale on mobile quote-card nodes', detail: `${stale2.length} records (${stale2.map((id) => `${FN.map.get(id).node.n} ${recordOf(FN.map.get(id).node).after.h} vs observed ${FN.map.get(id).node.h}`).join(', ')}) record heights 48 px smaller than the corrected observation, which is the DSC-consistent one (Author 104 = Avatar 56 + NameBlock 48, QuoteCard 297 = padding 48 + Stars 24 + Space 20 + Quote 81 + Space 20 + Author 104).` });
  }
  notes.push({ id: 'N7', title: 'Right-column hero image interpretation', detail: 'DSC columnInsetRule pins the right column\'s right edge to the inset. The check requires every right image to end at or inside width - inset and the first (Image5) to end exactly at it; the second right image is offset left by its own vw rule (right-[54vw] / right-[50vw]) and legitimately ends well inside.' });
}

// ===============================================================================================================
// Compact per-item table
// ===============================================================================================================
const sectionIds = (slug) => TIERS.map((t) => SEC[slug][t.key]?.pd?.[IDN]?.logicalId).filter(Boolean);
const statusOf = (...ids) => (ids.every((i) => checks.find((c) => c.id === i)?.status === 'PASS') ? 'PASS' : 'FAIL');
const itemTable = [];
{
  const b1 = items['R4-01'].rows;
  const w = (tier, k) => uniq(textColSections.map((s) => fmt(b1.find((r) => r.slug === s && r.tier === tier)[k]))).join('/');
  itemTable.push({
    item: 'R4-01 text column width',
    ids: compressIds(textColSections.flatMap((s) => sectionIds(s))),
    before: `${TIERS.map((t) => `${t.key} ${w(t.key, 'before')}`).join(', ')} px`,
    dsc: `min(container, ${textMax}): ${TIERS.map((t) => fmt(Math.min(textMax, tierGeom[t.key].container))).join(' / ')} (desktop / tablet / mobile); fs.token.size.text-column.max`,
    after: `${TIERS.map((t) => `${t.key} ${w(t.key, 'after')}`).join(', ')} px`,
    status: statusOf('B1'),
  });
  const m = items['R4-02'].rows;
  const ins = items['R4-02'].insts;
  const g0 = dscComp('fs.component.button.primary').geometry;
  itemTable.push({
    item: 'R4-02 button sizing',
    ids: [...compressIds(['fs.component.button.primary', 'fs.component.button.secondary']), ...compressIds(['navbar', 'hero', 'features', 'cta'].flatMap((s) => sectionIds(s)))],
    before: `instances ${uniq(ins.map((x) => `${r2(x.beforeW)}x${x.beforeH}`)).join('/')} (pad 12/24 plus inner stroke); n=${ins.length}`,
    dsc: `height ${g0.height}; width = label + 2 x ${g0.paddingX} + 2 x ${g0.strokeWidth} = ${m[0].expectedWidth}`,
    after: `mains ${uniq(m.map((r) => `${r.observedWidth}x${r.observedHeight}`)).join(',')} (pad ${JSON.stringify(m[0].padding)}); instances ${uniq(ins.map((x) => `${r2(x.afterW)}x${x.afterH}`)).join('/')}; n=${ins.length}`,
    status: statusOf('B2a', 'B2b', 'A2', 'A2c'),
  });
  const q = items['R4-03'].rows;
  itemTable.push({
    item: 'R4-03 mobile quote-card spacing',
    ids: compressIds(sectionIds('testimonials')),
    before: `Space ${uniq(q.flatMap((r) => r.before.spaceH)).join('/')}; Author ${q[0].before.authorDir} ${JSON.stringify(q[0].before.authorGap)} ${q[0].before.authorAi} h${q[0].before.authorH}`,
    dsc: `Space gap.5 = ${q[0].expected.starsGap}; Author ${q[0].expected.authorDir} / ${q[0].expected.authorAi} / gap 0; h = Avatar + NameBlock = ${q[0].expected.authorH}; tablet/desktop unchanged`,
    after: `Space ${uniq(q.flatMap((r) => r.after.spaceH)).join('/')}; Author ${q[0].after.authorDir} ${JSON.stringify(q[0].after.authorGap)} ${q[0].after.authorAi} h${q[0].after.authorH}; tablet/desktop controls unchanged`,
    status: statusOf('B3a', 'B3b'),
  });
  const h = items['R4-04'].rows;
  itemTable.push({
    item: 'R4-04 hero image columns',
    ids: compressIds(sectionIds('hero')),
    before: `left columns at x 0 (first image), right column flush to board edge; per-image heights ${uniq(h.flatMap((r) => r.images.map((i) => r2(i.beforeH)))).join('/')}`,
    dsc: `inset ${TIERS.map((t) => r2(C.boards[t.key].w * tierGeom[t.key].pct)).join(' / ')} (5 %); one height per column = 1.2 x widest (mobile also >= 35vw)`,
    after: h.map((r) => `${r.tier[0]}${r.side[0]}: first ${r.side === 'left' ? `x ${r2(r.images[0].x)}` : `right edge ${r2(r.images[0].right)}`}, h ${r2(r.images[0].h)}`).join('; '),
    status: statusOf('B4'),
  });
  const g = items['R4-05'].rows;
  itemTable.push({
    item: 'R4-05 testimonial grid gap',
    ids: [...compressIds(sectionIds('testimonials')), items['R4-05'].token.id],
    before: g.map((r) => `${r.tier[0]}: ${JSON.stringify(r.beforeGap)} ${r.beforeTokens ? r.beforeTokens.rowGap : 'no token'}`).join('; '),
    dsc: `${items['R4-05'].token.id} = ${items['R4-05'].token.value}, sm ${items['R4-05'].token.sm}; desktop/tablet ${g[0].expectedTokens}, mobile ${g[2].expectedTokens}`,
    after: g.map((r) => `${r.tier[0]}: ${JSON.stringify(r.afterGap)} ${r.afterTokens ? r.afterTokens.rowGap : 'no token'}`).join('; '),
    status: statusOf('B5'),
  });
}

// ===============================================================================================================
// Assemble report
// ===============================================================================================================
notes.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
const pass = checks.filter((c) => c.status === 'PASS').length;
const fail = checks.filter((c) => c.status === 'FAIL').length;
const groupStatus = (g) => (checks.filter((c) => c.group === g).every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL');
const report = {
  report: 'DRT',
  experiment: 'PEN-CLOUD-03-B',
  revision: 'R4',
  inputs: Object.fromEntries(Object.entries(INPUTS).map(([k, p]) => [k, { path: p, sha256: sha(raw[k]), capturedAt: J[k].capturedAt ?? J[k].createdAt ?? null, revision: J[k].revision ?? null }])),
  summary: {
    overall: fail === 0 ? 'PASS' : 'FAIL',
    checks: checks.length, pass, fail,
    groups: { A: groupStatus('A'), B: groupStatus('B'), C: groupStatus('C'), R: groupStatus('R') },
    required: ['A', 'B', 'C'].every((g) => groupStatus(g) === 'PASS') ? 'PASS' : 'FAIL',
    reconciliationRecords: { boardNodes: recNodes.length, buttonMains: mainsWithRec.length },
    scope: { totalChanged, ...counts, floatNoiseOnly: noiseOnly, captureRoundingOnly: roundingOnly, identical: unchanged },
  },
  itemTable,
  checks,
  scope: {
    categories: catLabels,
    counts,
    totalChanged,
    floatNoiseOnly: noiseOnly,
    captureRoundingOnly: roundingOnly,
    identical: unchanged,
    unexplained,
    changed: results.map((r) => ({ id: r.id, tier: r.tier, name: r.name, type: r.type, changed: r.changed, category: r.cat, why: r.why })),
  },
  notes,
};
writeFileSync(resolve(HERE, 'drt-report.json'), JSON.stringify(report, null, 2) + '\n');

// ---------------------------------------------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const md = [];
md.push('# Design Reconciliation Test: PEN-CLOUD-03-B R4');
md.push('');
md.push(`Overall: **${report.summary.overall}** (${pass} PASS, ${fail} FAIL of ${checks.length} checks). A (identity): ${report.summary.groups.A}, B (DSC agreement): ${report.summary.groups.B}, C (scope control): ${report.summary.groups.C}, R (record fidelity, extra): ${report.summary.groups.R}.`);
md.push('');
md.push('Purpose: each corrected Penpot object keeps its Foundation identity and agrees with the accepted DSC r4. Generated by `drt/drt.mjs`; deterministic for given inputs.');
md.push('');
md.push('## Inputs');
md.push('');
md.push('| input | file | sha256 (first 16) | capturedAt |');
md.push('|---|---|---|---|');
for (const [k, v] of Object.entries(report.inputs)) md.push(`| ${k} | \`${v.path}\` | ${v.sha256.slice(0, 16)} | ${v.capturedAt ?? ''} |`);
md.push('');
md.push('## Per-item reconciliation');
md.push('');
md.push('| item | affected Foundation ids | observed before | DSC intent | corrected after | result |');
md.push('|---|---|---|---|---|---|');
for (const r of itemTable) md.push(`| ${esc(r.item)} | ${esc(r.ids.map((x) => '`' + x + '`').join(', '))} | ${esc(r.before)} | ${esc(r.dsc)} | ${esc(r.after)} | **${r.status}** |`);
md.push('');
md.push('## Check summary');
md.push('');
md.push('| id | check | result | detail |');
md.push('|---|---|---|---|');
for (const c of checks) md.push(`| ${c.id} | ${esc(c.title)} | **${c.status}** | ${esc(c.detail)} |`);
md.push('');

md.push('## A. Identity preservation');
md.push('');
const a1 = checks.find((c) => c.id === 'A1');
md.push('| section node | logicalId | tier | identity identical | same parent | DSC external id |');
md.push('|---|---|---|---|---|---|');
for (const r of a1.rows) md.push(`| \`${r.id.slice(-12)}\` ${esc(r.name)} | \`${r.logicalId}\` | ${r.tier} | ${r.identical ? 'yes' : 'NO'} | ${r.sameParent ? 'yes' : 'NO'} | ${r.dscExternalMatch ? 'yes' : 'NO'} |`);
md.push('');
const a4 = checks.find((c) => c.id === 'A4');
md.push(`Nodes with a \`${REC}\` record: **${a4.count}** board nodes (+${mainsWithRec.length} button mains in buttonMains = ${a4.countWithMains}). By item: ` + uniq(a4.rows.map((r) => r.item.split(' ')[0])).map((it) => `${it} x${a4.rows.filter((r) => r.item.startsWith(it)).length}`).join(', ') + `. Nodes that had identity or semantic plugin data in the original: ${a4.rows.filter((r) => r.hadIdentity || r.hadSemantic).length}; lost or altered plugin data: ${a4.failing.length} (the corrected objects reach Foundation identity through their enclosing sections, see A4b).`);
md.push('');
const a2 = checks.find((c) => c.id === 'A2');
md.push('| button main | DSC mainShapeId | observed id | match | identity present |');
md.push('|---|---|---|---|---|');
for (const r of a2.rows) md.push(`| \`${r.logicalId}\` | \`${r.mainShapeId}\` | \`${r.observedId}\` | ${r.idMatchesDsc ? 'yes' : 'NO'} | ${r.identityPresent ? 'yes' : 'NO'} |`);
md.push('');

md.push('## B. Agreement with DSC r4');
md.push('');
md.push('### B1 text columns');
md.push('');
md.push('| section | tier | node | before | after | expected | record | result |');
md.push('|---|---|---|---|---|---|---|---|');
for (const r of items['R4-01'].rows) md.push(`| \`${r.section}\` | ${r.tier} | ${r.node} | ${fmt(r.before)} | ${fmt(r.after)} | ${fmt(r.expected)} | ${r.record ? 'yes' : r.expectsRecord ? 'MISSING' : 'none (unchanged)'} | ${r.ok ? 'PASS' : 'FAIL'} |`);
md.push('');
md.push('### B2 buttons');
md.push('');
md.push('| main | label w | expected w x h | observed w x h | padding | result |');
md.push('|---|---|---|---|---|---|');
for (const r of items['R4-02'].rows) md.push(`| \`${r.logicalId}\` | ${r.labelWidth} | ${r.expectedWidth} x ${r.expectedHeight} | ${r.observedWidth} x ${r.observedHeight} | ${JSON.stringify(r.padding)} | ${r.ok ? 'PASS' : 'FAIL'} |`);
md.push('');
md.push('| tier | button instances | 50 tall | heights before |');
md.push('|---|---|---|---|');
for (const t of TIERS) { const ii = items['R4-02'].insts.filter((x) => x.tier === t.key); md.push(`| ${t.key} | ${ii.length} | ${ii.filter((x) => x.ok).length} | ${uniq(ii.map((x) => x.beforeH)).join(',')} |`); }
md.push('');
md.push('### B3 quote cards');
md.push('');
md.push('| tier | card | Space h (before > after) | Author (after) | Author h | result |');
md.push('|---|---|---|---|---|---|');
for (const r of items['R4-03'].rows) md.push(`| mobile | \`${r.id.slice(-12)}\` | ${r.before.spaceH.join('/')} > ${r.after.spaceH.join('/')} | ${r.after.authorDir} / ${r.after.authorAi} / ${JSON.stringify(r.after.authorGap)} | ${r.after.authorH} (= ${r.after.avatarH} + ${r.after.nameBlockH}) | ${r.ok ? 'PASS' : 'FAIL'} |`);
for (const r of items['R4-03'].ctrl) md.push(`| ${r.tier} | \`${r.id.slice(-12)}\` | unchanged | unchanged | unchanged | ${r.ok ? 'PASS' : 'FAIL'} |`);
md.push('');
md.push('### B4 hero images');
md.push('');
md.push('| tier | column | board w | inset | first image x (was) | first image right edge | heights | expected h | widths unchanged | result |');
md.push('|---|---|---|---|---|---|---|---|---|---|');
for (const r of items['R4-04'].rows) md.push(`| ${r.tier} | ${r.side} | ${r.boardWidth} | ${fmt(r.inset)} | ${fmt(r.images[0].x)} (${fmt(r.images[0].beforeX)}) | ${fmt(r.images[0].right)} | ${r.images.map((i) => fmt(i.h)).join(' / ')} | ${fmt(r.expectedHeight)} | ${r.checks.widthsUnchanged ? 'yes' : 'NO'} | ${r.ok ? 'PASS' : 'FAIL'} |`);
md.push('');
md.push('### B5 grid gap');
md.push('');
md.push('| tier | before | after | expected | result |');
md.push('|---|---|---|---|---|');
for (const r of items['R4-05'].rows) md.push(`| ${r.tier} | ${JSON.stringify(r.beforeGap)} ${r.beforeTokens ? r.beforeTokens.rowGap : 'no token'} | ${JSON.stringify(r.afterGap)} ${r.afterTokens ? r.afterTokens.rowGap + ' / ' + r.afterTokens.columnGap : 'no token'} | [${r.expectedGap},${r.expectedGap}] ${r.expectedTokens} | ${r.ok ? 'PASS' : 'FAIL'} |`);
md.push('');

md.push('## C. Scope control');
md.push('');
md.push('| category | count |');
md.push('|---|---|');
for (const k of ['a', 'b', 'c', 'd']) md.push(`| ${catLabels[k]} | ${counts[k]} |`);
md.push(`| **unexplained** | **${counts.unexplained}** |`);
md.push(`| total changed (3 canvas boards included) | ${totalChanged} |`);
md.push(`| float-noise-only, below 1e-6 (not counted as changed) | ${noiseOnly} |`);
md.push(`| capture-rounding-only, below ${ROUND_TOL} px (not counted as changed) | ${roundingOnly} |`);
md.push(`| identical | ${unchanged} |`);
md.push('');
md.push('Direct corrections by item: ' + Object.keys(expectedSets).map((it) => `${it} x${results.filter((r) => r.cat === 'a' && r.item === it).length}`).join(', ') + '.');
md.push('');
if (unexplained.length) {
  md.push('Unexplained changes:');
  md.push('');
  md.push('| id | tier | name | changed | reason |');
  md.push('|---|---|---|---|---|');
  for (const u of unexplained) md.push(`| \`${u.id}\` | ${u.tier} | ${u.name} | ${u.changed.join(',')} | ${esc(u.why)} |`);
} else md.push('Unexplained changes: none.');
md.push('');
md.push('Rules: (a) node carries a reconciliation record, only touches properties its item governs, and is in the expected node set; (b) change is y only, or x/y inside a changed ancestor (every x/y change must also equal the auto-layout position, check C6); (c) width equals the corrected parent width, text re-wrap height inside a corrected text column, or a button instance equal to DSC geometry; (d) auto-layout container (or canvas board) whose new size equals the arithmetic of its corrected children. Numeric differences below 1e-6 are float noise and below 0.05 px capture rounding (smallest real correction is 0.4 px). Text alignment, stroke shape and component display names are normalised (see N2).');
md.push('');
md.push('## R. Record fidelity (extra checks)');
md.push('');
for (const c of checks.filter((x) => x.group === 'R')) {
  md.push(`- **${c.id} ${c.status}** ${c.title}. ${c.detail}`);
  for (const m of (c.mismatches || []).filter((x) => x.field)) md.push(`  - \`${m.id.slice(-12)}\` ${m.name ?? FN.map.get(m.id)?.node.n ?? ''} ${m.field}: record ${m.record}, observed ${m.observed}`);
}
md.push('');
md.push('## Notes on the inputs (reported, not corrected)');
md.push('');
for (const n of notes) md.push(`- **${n.id} ${n.title}.** ${n.detail}`);
md.push('');
writeFileSync(resolve(HERE, 'drt-report.md'), md.join('\n'));

// console summary
console.log(`DRT ${report.summary.overall}: ${pass} PASS, ${fail} FAIL of ${checks.length}`);
for (const c of checks) console.log(`  ${c.status}  ${c.id.padEnd(4)} ${c.title}`);
console.log(`scope: changed=${totalChanged} a=${counts.a} b=${counts.b} c=${counts.c} d=${counts.d} unexplained=${counts.unexplained} noise=${noiseOnly} rounding=${roundingOnly} identical=${unchanged}`);
for (const u of unexplained) console.log(`  UNEXPLAINED ${u.id} ${u.tier} ${u.name} [${u.changed.join(',')}] ${u.why}`);
process.exitCode = fail ? 1 : 0;
