// Functions that run INSIDE the page (serialised by Playwright). They must be self-contained.

/**
 * Installs window.__pc, a helper namespace used by the other in-page calls.
 * arg = { copy, route, governedExact }
 */
export function installHelpers(arg) {
  const { copy, route } = arg;
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const r2 = (n) => Math.round(n * 100) / 100;
  const subject = () => document.querySelector('[data-fs-subject]');
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r2(r.left + window.scrollX), y: r2(r.top + window.scrollY), w: r2(r.width), h: r2(r.height) };
  };
  const STYLE_PROPS = ['display', 'flex-direction', 'gap', 'padding', 'font-family', 'font-size', 'background-color', 'border-radius'];
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of STYLE_PROPS) o[p] = cs.getPropertyValue(p);
    if (!o.padding) o.padding = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ');
    o['padding-top'] = cs.paddingTop;
    o['padding-bottom'] = cs.paddingBottom;
    o.position = cs.position;
    return o;
  };
  const textOf = (el, n = 40) => norm(el.innerText != null ? el.innerText : el.textContent).slice(0, n);
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };

  // ---- section location (works identically for every arm: uses the shared copy) ----
  const locateSections = () => {
    const root = subject() || document.body;
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const byText = (t) => hs.find((h) => norm(h.textContent) === norm(t));
    const anchors = {
      navbar: document.querySelector('nav'),
      header80: byText(copy.header80.heading),
      layout620: byText(copy.layout620.heading),
      testimonial37: byText(copy.testimonial37.heading),
      cta25: byText(copy.cta25.heading),
    };
    const out = {};
    if (route === 'button') return out;
    if (route !== 'page') {
      out[route] = root;
      return out;
    }
    for (const [key, a] of Object.entries(anchors)) {
      if (!a) continue;
      let el = a;
      while (el.parentElement && el.parentElement !== document.body && el.parentElement !== root) {
        const par = el.parentElement;
        if (Object.values(anchors).some((o) => o && o !== a && par.contains(o))) break;
        el = par;
      }
      out[key] = el;
    }
    return out;
  };

  const distinct = (nums, tol = 2) => {
    const s = [...nums].sort((a, b) => a - b);
    const out = [];
    for (const n of s) if (!out.length || Math.abs(n - out[out.length - 1]) > tol) out.push(n);
    return out;
  };

  const layoutColumns = (sections) => {
    const sec = sections.layout620;
    const h3s = sec ? [...sec.querySelectorAll('h3')] : route === 'layout620' ? [...document.querySelectorAll('h3')] : [];
    const xs = distinct(h3s.map((h) => Math.round(h.getBoundingClientRect().left + window.scrollX)));
    return { h3Count: h3s.length, xs, columns: xs.length };
  };

  const testimonialColumns = (sections) => {
    const sec = sections.testimonial37;
    if (!sec) return null;
    const want = copy.testimonial37.cards.length;
    const all = [sec, ...sec.querySelectorAll('*')];
    let grid = all.find((e) => e.children.length === want && ['grid', 'flex', 'inline-grid', 'inline-flex'].includes(getComputedStyle(e).display));
    if (!grid) grid = all.find((e) => e.children.length === want);
    let how = 'children===cards';
    if (!grid) {
      const cands = all.filter((e) => getComputedStyle(e).display === 'grid' && e.children.length >= 2);
      cands.sort((a, b) => b.children.length - a.children.length);
      grid = cands[0];
      how = 'largest-grid';
    }
    if (!grid) return { found: false };
    const kids = [...grid.children];
    const xs = distinct(kids.map((k) => Math.round(k.getBoundingClientRect().left + window.scrollX)));
    const ys = distinct(kids.map((k) => Math.round(k.getBoundingClientRect().top + window.scrollY)));
    const cs = getComputedStyle(grid);
    return { found: true, how, gridTag: grid.tagName.toLowerCase(), display: cs.display, gridTemplateColumns: cs.gridTemplateColumns,
      cardCount: kids.length, xs, ys, columns: xs.length, rows: ys.length };
  };

  const findStage = (sec) => {
    if (!sec) return null;
    const all = [sec, ...sec.querySelectorAll('*')];
    const stage = all.find((e) => getComputedStyle(e).position === 'sticky');
    if (!stage) return { stage: null, scrollSection: sec };
    let el = stage.parentElement;
    while (el && el.offsetHeight <= stage.offsetHeight + 8) el = el.parentElement;
    return { stage, scrollSection: el || sec };
  };

  const ROLE_SEL = 'header,nav,main,section,footer,aside,[role],h1,h2,h3,h4,h5,h6,button,a';
  const implicitRole = (el) => {
    const t = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(t)) return 'heading';
    switch (t) {
      case 'nav': return 'navigation';
      case 'main': return 'main';
      case 'aside': return 'complementary';
      case 'button': return 'button';
      case 'a': return el.hasAttribute('href') ? 'link' : 'generic';
      case 'header': return el.parentElement && el.parentElement.closest('article,aside,main,nav,section,[role=article],[role=complementary],[role=main],[role=navigation],[role=region]') ? 'generic' : 'banner';
      case 'footer': return el.parentElement && el.parentElement.closest('article,aside,main,nav,section,[role=article],[role=complementary],[role=main],[role=navigation],[role=region]') ? 'generic' : 'contentinfo';
      case 'section': return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') ? 'region' : 'generic';
      default: return null;
    }
  };

  const collectRoles = (sections) => {
    const els = [...document.body.querySelectorAll(ROLE_SEL)];
    const secEntries = Object.entries(sections);
    const roles = els.map((el) => {
      const tag = el.tagName.toLowerCase();
      const explicit = (el.getAttribute('role') || '').trim().split(/\s+/)[0] || null;
      const role = explicit || implicitRole(el);
      let level = null;
      if (role === 'heading') level = Number(el.getAttribute('aria-level')) || (/^h[1-6]$/.test(tag) ? Number(tag[1]) : null);
      const sec = secEntries.find(([, s]) => s.contains(el));
      return {
        tag, role, explicitRole: explicit, level,
        text: textOf(el, 40), ariaLabel: el.getAttribute('aria-label'),
        dataFsId: el.getAttribute('data-fs-id'), dataFsBbc: el.getAttribute('data-fs-bbc'), dataFsPenpot: el.getAttribute('data-fs-penpot'),
        visible: isVisible(el), section: sec ? sec[0] : null,
      };
    });
    return { els, roles };
  };

  window.__pc = { norm, r2, subject, box, styleOf, textOf, isVisible, locateSections, layoutColumns, testimonialColumns, findStage, collectRoles, distinct, implicitRole };
  return true;
}

/** DOM roles + geometry for the current route. Requires installHelpers. */
export function collectDomAndGeometry() {
  const pc = window.__pc;
  const sections = pc.locateSections();
  const { els, roles } = pc.collectRoles(sections);
  const root = pc.subject();
  const tagCounts = {};
  for (const e of document.body.querySelectorAll('*')) {
    const t = e.tagName.toLowerCase();
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  const dom = { subjectFound: !!root, subjectName: root ? root.getAttribute('data-fs-subject') : null, roles, tagCounts,
    sectionsFound: Object.keys(sections) };

  const rootEl = root || document.body;
  const geometry = {
    subjectFound: !!root,
    subject: { tag: rootEl.tagName.toLowerCase(), dataFsId: rootEl.getAttribute('data-fs-id'), box: pc.box(rootEl), style: pc.styleOf(rootEl) },
    children: [...rootEl.children].map((c) => ({
      tag: c.tagName.toLowerCase(), dataFsId: c.getAttribute('data-fs-id'), dataFsPenpot: c.getAttribute('data-fs-penpot'),
      text: pc.textOf(c, 30), box: pc.box(c), style: pc.styleOf(c),
    })),
    sections: Object.fromEntries(Object.entries(sections).map(([k, s]) => [k, { tag: s.tagName.toLowerCase(), box: pc.box(s), style: pc.styleOf(s) }])),
    elements: els.map((el, i) => ({ i, tag: roles[i].tag, role: roles[i].role, level: roles[i].level, text: roles[i].text, visible: roles[i].visible, box: pc.box(el) })),
    columns: {},
    fsIds: [...document.querySelectorAll('[data-fs-id]')].map((e) => ({ id: e.getAttribute('data-fs-id'), penpot: e.getAttribute('data-fs-penpot'), tag: e.tagName.toLowerCase(), box: pc.box(e) })),
    doc: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, innerWidth: window.innerWidth, innerHeight: window.innerHeight },
  };
  if (sections.layout620) geometry.columns.layout620 = pc.layoutColumns(sections);
  if (sections.testimonial37) geometry.columns.testimonial37 = pc.testimonialColumns(sections);
  return { dom, geometry };
}

/** Per-width sweep sample. */
export function collectSweep() {
  const pc = window.__pc;
  const sections = pc.locateSections();
  const root = pc.subject() || document.body;
  const sectionsOut = {};
  for (const [k, s] of Object.entries(sections)) {
    const cs = getComputedStyle(s);
    sectionsOut[k] = { tag: s.tagName.toLowerCase(), paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, box: pc.box(s) };
  }
  const cs = getComputedStyle(root);
  const out = {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth,
    subject: { found: !!pc.subject(), paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom },
    sections: sectionsOut,
    columns: {},
  };
  if (sections.layout620) out.columns.layout620 = pc.layoutColumns(sections).columns;
  if (sections.testimonial37) { const t = pc.testimonialColumns(sections); out.columns.testimonial37 = t && t.found ? t.columns : null; }
  if (sections.header80) {
    const st = pc.findStage(sections.header80);
    if (st && st.stage) {
      const h = st.stage.getBoundingClientRect().height;
      out.stage = { found: true, height: pc.r2(h), innerHeight: window.innerHeight, fillsViewport: Math.abs(h - window.innerHeight) <= 1,
        scrollSectionHeight: st.scrollSection.offsetHeight };
    } else out.stage = { found: false, innerHeight: window.innerHeight };
  }
  return out;
}

/** Header80 scroll probe sample at fraction p. Scrolls, caller waits, then calls readProbe. */
export function scrollToProbe(p) {
  const pc = window.__pc;
  const sections = pc.locateSections();
  const sec = sections.header80;
  const st = pc.findStage(sec);
  const scrollSection = st ? st.scrollSection : sec;
  const top = scrollSection.getBoundingClientRect().top + window.scrollY;
  const h = scrollSection.offsetHeight;
  const y = top + p * (h - window.innerHeight);
  window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  return { sectionTop: pc.r2(top), sectionHeight: h, targetY: pc.r2(y), stickyFound: !!(st && st.stage) };
}

export function readProbe() {
  const pc = window.__pc;
  const sections = pc.locateSections();
  const st = pc.findStage(sections.header80);
  const parse = (t) => {
    if (!t || t === 'none') return { raw: t || 'none', none: true, tx: 0, ty: 0, scaleX: 1, scaleY: 1, identity: true };
    const m = /^matrix3d\((.+)\)$/.exec(t);
    let v;
    if (m) { v = m[1].split(',').map(Number); v = { a: v[0], b: v[1], c: v[4], d: v[5], tx: v[12], ty: v[13] }; }
    else {
      const m2 = /^matrix\((.+)\)$/.exec(t);
      if (!m2) return { raw: t, none: false, unparsed: true, tx: null, ty: null, identity: null };
      const n = m2[1].split(',').map(Number);
      v = { a: n[0], b: n[1], c: n[2], d: n[3], tx: n[4], ty: n[5] };
    }
    const identity = Math.abs(v.a - 1) < 1e-6 && Math.abs(v.d - 1) < 1e-6 && Math.abs(v.b) < 1e-6 && Math.abs(v.c) < 1e-6 && Math.abs(v.tx) < 0.01 && Math.abs(v.ty) < 0.01;
    return { raw: t, none: false, tx: pc.r2(v.tx), ty: pc.r2(v.ty), scaleX: v.a, scaleY: v.d, identity };
  };
  const col = (name) => {
    const el = document.querySelector('[data-fs-motion="' + name + '"]');
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const tr = parse(cs.transform);
    return { found: true, ...tr, offsetHeight: el.offsetHeight, translateYPct: el.offsetHeight ? pc.r2((tr.ty || 0) / el.offsetHeight * 100) : null };
  };
  const stageEl = st && st.stage;
  const stage = stageEl ? (() => { const r = stageEl.getBoundingClientRect(); return { found: true, top: pc.r2(r.top), height: pc.r2(r.height), innerHeight: window.innerHeight }; })()
    : { found: false, innerHeight: window.innerHeight };
  return { scrollY: pc.r2(window.scrollY), maxScrollY: document.documentElement.scrollHeight - window.innerHeight, left: col('images-left'), right: col('images-right'), stage };
}

/** Token integrity: declarations applied on this page + --fs-* custom properties. */
export function collectDecls() {
  const GOV_EXACT = new Set(['color', 'background-color', 'font-size', 'gap', 'row-gap', 'column-gap', 'grid-gap', 'border-radius', 'line-height', 'font-weight', 'font-family', 'padding']);
  const governed = (p) => GOV_EXACT.has(p) || /^padding-/.test(p) || /^border(-(top|right|bottom|left|inline|block)(-(start|end))?)?-color$/.test(p) || /^border-(top|bottom|start|end)-(left|right|start|end)-radius$/.test(p);
  const SHORT = new Set(['background', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'font', 'outline']);
  const splitDecls = (css) => {
    const out = [];
    let depth = 0, q = null, cur = '';
    for (let i = 0; i < css.length; i++) {
      const ch = css[i];
      if (q) { cur += ch; if (ch === q && css[i - 1] !== '\\') q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ';' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.map((d) => { const i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).replace(/!important\s*$/i, '').trim()]; }).filter(Boolean);
  };
  const NEUTRAL = /^(inherit|initial|unset|revert|revert-layer|currentcolor|transparent|none|normal|auto|0)$/i;
  const classify = (v) => {
    if (/var\(\s*--fs-/i.test(v)) {
      const stripped = v.replace(/var\((?:[^()]|\([^()]*\))*\)/gi, '');
      return { cls: 'var', mixed: /#[0-9a-f]{3,8}\b|\d(px|rem|em)\b/i.test(stripped) };
    }
    if (NEUTRAL.test(v)) return { cls: 'neutral' };
    const stripped = v.replace(/var\((?:[^()]|\([^()]*\))*\)/gi, '').trim();
    if (/var\(/i.test(v) && !stripped) return { cls: 'otherVar' };
    return { cls: 'literal' };
  };
  const out = [];
  const unreadable = [];
  const fsProps = new Set();
  const sheetIds = new Map();
  const sheetId = (sheet, idx) => {
    if (sheetIds.has(sheet)) return sheetIds.get(sheet);
    let id;
    if (sheet.href) id = sheet.href.replace(location.origin, '');
    else { let txt = ''; try { txt = sheet.ownerNode && sheet.ownerNode.textContent ? sheet.ownerNode.textContent.slice(0, 60) : ''; } catch {} id = 'inline#' + idx + ':' + txt.replace(/\s+/g, ' '); }
    sheetIds.set(sheet, id);
    return id;
  };
  const stripState = (sel) => sel.replace(/::?(hover|focus|focus-visible|focus-within|active|visited|disabled|checked|placeholder|before|after|selection|first-line|first-letter|marker|backdrop|-[a-z-]+)(\([^)]*\))?/gi, '');
  const matches = (sel) => {
    try { if (document.querySelector(sel)) return true; } catch { return true; }
    try { const s2 = stripState(sel).trim(); if (s2 && s2 !== sel) return !!document.querySelector(s2); } catch { return true; }
    return false;
  };
  const handleDecls = (decls, selector, key) => {
    for (const [prop, value] of decls) {
      if (prop.startsWith('--fs-')) fsProps.add(prop);
      const isGov = governed(prop);
      const isShort = SHORT.has(prop);
      if (!isGov && !isShort) continue;
      const c = classify(value);
      out.push({ key: key + '|' + prop, selector: selector.slice(0, 120), prop, value: value.slice(0, 160), cls: c.cls, mixed: !!c.mixed, shorthand: isShort });
    }
  };
  const walk = (rules, sid, path) => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const p = path + '/' + i;
      const ctor = rule.constructor && rule.constructor.name;
      if (ctor === 'CSSStyleRule') {
        const decls = splitDecls(rule.style.cssText);
        for (const [prop] of decls) if (prop.startsWith('--fs-')) fsProps.add(prop);
        if (matches(rule.selectorText)) handleDecls(decls, rule.selectorText, sid + '|' + p);
        if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules, sid, p);
      } else if (ctor === 'CSSMediaRule') {
        let ok = true;
        try { ok = window.matchMedia(rule.media.mediaText).matches; } catch {}
        if (ok) walk(rule.cssRules, sid, p);
      } else if (ctor === 'CSSSupportsRule') {
        let ok = true;
        try { ok = CSS.supports(rule.conditionText); } catch {}
        if (ok) walk(rule.cssRules, sid, p);
      } else if (ctor === 'CSSImportRule') {
        if (rule.styleSheet) { try { walk(rule.styleSheet.cssRules, sid, p); } catch { unreadable.push(sid + p); } }
      } else if (ctor === 'CSSKeyframesRule' || ctor === 'CSSFontFaceRule' || ctor === 'CSSPropertyRule' || ctor === 'CSSKeyframeRule') {
        continue;
      } else if (rule.cssRules) {
        walk(rule.cssRules, sid, p);
      }
    }
  };
  const sheets = [...document.styleSheets, ...(document.adoptedStyleSheets || [])];
  sheets.forEach((sheet, idx) => {
    let rules;
    try { rules = sheet.cssRules; } catch { unreadable.push(sheet.href || 'inline#' + idx); return; }
    walk(rules, sheetId(sheet, idx), 's');
  });
  // inline style attributes
  let inlineCount = 0;
  for (const el of document.querySelectorAll('[style]')) {
    const css = el.getAttribute('style') || '';
    const decls = splitDecls(css);
    inlineCount++;
    const sel = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');
    for (const d of decls) {
      if (d[0].startsWith('--fs-')) fsProps.add(d[0]);
    }
    handleDecls(decls, 'style[' + sel + ']', 'attr|' + sel + '|' + css.slice(0, 80));
  }
  const rootCs = getComputedStyle(document.documentElement);
  const fsVars = {};
  for (const name of fsProps) fsVars[name] = rootCs.getPropertyValue(name).trim();
  return { decls: out, unreadable, inlineStyleElements: inlineCount, fsVars };
}

/** Fonts state. */
export async function readFonts() {
  await document.fonts.ready;
  const faces = [...document.fonts].map((f) => ({ family: String(f.family).replace(/["']/g, ''), weight: f.weight, style: f.style, status: f.status, unicodeRange: f.unicodeRange }));
  const ss3 = faces.filter((f) => f.family === 'Source Sans 3');
  const body = getComputedStyle(document.body).fontFamily;
  return {
    faces: ss3, faceCount: ss3.length, loadedCount: ss3.filter((f) => f.status === 'loaded').length,
    source_sans_3_loaded: ss3.some((f) => f.status === 'loaded'),
    checkApi: document.fonts.check('16px "Source Sans 3"'), bodyFontFamily: body,
    otherFaces: faces.filter((f) => f.family !== 'Source Sans 3').map((f) => f.family),
  };
}

/** Keyboard helpers. */
export function describeActive() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { tag: 'body', text: '' };
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), text: norm(el.innerText != null ? el.innerText : el.textContent).slice(0, 40),
    ariaLabel: el.getAttribute('aria-label'), href: el.getAttribute('href') ? 'yes' : null,
    focusVisible: (() => { try { return el.matches(':focus-visible'); } catch { return null; } })() };
}

export function markFirstButton() {
  const els = [...document.querySelectorAll('button,[role=button]')].filter((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden';
  });
  const el = els[0];
  document.querySelectorAll('[data-pc-first-button]').forEach((e) => e.removeAttribute('data-pc-first-button'));
  if (!el) return false;
  el.setAttribute('data-pc-first-button', '1');
  return true;
}

export function readFocusStyle() {
  const el = document.querySelector('[data-pc-first-button]');
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  const focused = document.activeElement === el;
  let fv = null;
  try { fv = el.matches(':focus-visible'); } catch {}
  const outlineW = parseFloat(cs.outlineWidth) || 0;
  const outlineVisible = cs.outlineStyle !== 'none' && outlineW > 0 && cs.outlineColor !== 'rgba(0, 0, 0, 0)';
  const shadowVisible = cs.boxShadow && cs.boxShadow !== 'none';
  return { found: true, focused, matchesFocusVisible: fv, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor,
    outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow, outlineVisible, indicatorVisible: !!(outlineVisible || shadowVisible) };
}
