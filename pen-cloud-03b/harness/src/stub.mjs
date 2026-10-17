// Trivial stub arm used by --dry-run. It is NOT a reference implementation; it only has to be
// rich enough to exercise every harness measurement end to end.
//   variant 'plain'  : literal CSS, no data-fs-* attributes          (stands in for A)
//   variant 'static' : like plain but header80 has static columns, honours ?bp= (stands in for B/B')
//   variant 'fs'     : data-fs-* attributes and CSS bound to --fs-* custom properties (stands in for C)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { INPUTS_DIR, loadCopy, loadDsc } from './config.mjs';

const copy = loadCopy();
const dsc = loadDsc();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const fsVarName = (id) => '--fs-' + id.replace(/^fs\.token\./, '').replace(/\./g, '-');

function css(variant) {
  const fsMode = variant === 'fs';
  const tok = {};
  for (const t of dsc.tokens.entries) tok[t.id.replace(/^fs\.token\./, '')] = t.value;
  // v('space.gap.4') -> var(--fs-space-gap-4) in fs mode, literal otherwise
  const v = (id) => (fsMode ? `var(${fsVarName('fs.token.' + id)})` : tok[id]);
  const root = fsMode ? ':root{' + dsc.tokens.entries.map((t) => `${fsVarName(t.id)}:${t.value}`).join(';') + '}' : '';
  const bump = variant === 'static' ? '1px' : '0px';
  return `${root}
*{box-sizing:border-box}
html,body{margin:0;background:#fff}
body{font-family:${v('font.family.sans')};color:${v('color.scheme.text')};font-size:${v('font.size.regular')};line-height:${v('font.lineHeight.body')}}
h1{font-size:${v('font.size.h1')};line-height:${v('font.lineHeight.heading')};font-weight:${v('font.weight.bold')};margin:0}
h2{font-size:${v('font.size.h2')};line-height:${v('font.lineHeight.heading')};font-weight:${v('font.weight.bold')};margin:0}
h3{font-size:${v('font.size.h4')};line-height:${v('font.lineHeight.h4')};font-weight:${v('font.weight.bold')};margin:0}
p{margin:0}
.container{max-width:1280px;margin:0 auto}
.section{padding:${v('space.section.lg')} 5%;padding-top:calc(${v('space.section.lg')} + ${bump})}
.btn{display:inline-flex;align-items:center;gap:${v('space.gap.4')};padding:12px 24px;border:1px solid ${v('color.scheme.border')};border-radius:${v('radius.button')};font:inherit;font-size:${v('font.size.regular')};cursor:pointer}
.btn:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.btn-primary{background-color:${v('color.neutral.darkest')};color:${v('color.scheme.btn-text')}}
.btn-secondary{background-color:${v('color.scheme.foreground')};color:${v('color.scheme.text')}}
.row{display:flex;gap:${v('space.gap.4')};flex-wrap:wrap}
.logo{width:84px;height:36px;background:#000}
.navbar{display:flex;align-items:center;justify-content:space-between;gap:${v('space.gap.8')};padding:0 5%;min-height:72px;border-bottom:1px solid #000}
.navlinks{display:flex;gap:${v('space.gap.6')}}
.burger{display:none;width:24px;height:24px;background:none;border:0;padding:0}
.hero-scroll{height:300vh;position:relative}
.stage{position:sticky;top:0;height:100vh;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;gap:${v('space.gap.8')};padding:0 5%;align-items:center}
.cols{display:flex;gap:${v('space.gap.4')}}
.col{display:flex;flex-direction:column;gap:${v('space.gap.4')};width:50%;will-change:transform}
.img{background:#d9d9d9;height:160px}
.feat{display:grid;grid-template-columns:repeat(3,1fr);gap:${v('space.gap.8')};margin-top:${v('space.gap.8')}}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:${v('space.gap.6')};margin-top:${v('space.gap.8')}}
.card{border:1px solid #000;padding:${v('space.gap.6')};border-radius:${v('radius.card')};min-height:140px}
.icon{width:48px;height:48px;background:#000;margin-bottom:${v('space.gap.4')}}
a.lnk{color:${v('color.scheme.text')};text-decoration:underline}
@media (max-width:1023px){.section{padding-top:calc(${v('space.section.md')} + ${bump});padding-bottom:${v('space.section.md')}}.grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:767px){.section{padding-top:calc(${v('space.section.sm')} + ${bump});padding-bottom:${v('space.section.sm')}}.feat,.grid{grid-template-columns:1fr}.navlinks{display:none}.burger{display:block}.hero-scroll{height:150vh}.stage{grid-template-columns:1fr}h1{font-size:${v('font.size.h3')}}h2{font-size:${v('font.size.h4')}}}
`;
}

const idAttr = (variant, id) => (variant === 'fs' ? ` data-fs-id="${id}" data-fs-penpot="stub-${id}"` : '');
const bbcAttr = (variant, b) => (variant === 'fs' ? ` data-fs-bbc="${b}"` : '');

const btn = (variant, kind, label) => `<button class="btn btn-${kind}"${idAttr(variant, 'fs.component.button.' + kind)}>${esc(label)}</button>`;

function navbar(variant) {
  return `<nav class="navbar"${idAttr(variant, 'fs.section.navbar.desktop')}${bbcAttr(variant, 'bbc.nav.open-menu')}>
<div class="logo" role="img" aria-label="${esc(copy.navbar.logoAlt)}"></div>
<div class="navlinks">${copy.navbar.links.map((l) => `<a href="#">${esc(l)}</a>`).join('')}</div>
${btn(variant, 'primary', copy.navbar.button)}
<button class="burger" aria-label="Open menu" aria-expanded="false"><span style="display:block;width:24px;height:2px;background:#000"></span></button>
</nav>`;
}
function header80(variant) {
  const h = copy.header80;
  const motion = variant !== 'static';
  const imgs = (n) => Array.from({ length: n }, () => '<div class="img"></div>').join('');
  return `<div class="hero-scroll" id="hero-scroll"><header class="stage"${idAttr(variant, 'fs.section.hero.desktop')}${bbcAttr(variant, 'bbc.hero.scroll-parallax')}>
<div><h1>${esc(h.heading)}</h1><p style="margin:24px 0">${esc(h.description)}</p><div class="row">${btn(variant, 'primary', 'Button')}${btn(variant, 'secondary', 'Button')}</div></div>
<div class="cols"><div class="col" data-fs-motion="images-left">${imgs(3)}</div><div class="col" data-fs-motion="images-right">${imgs(3)}</div></div>
</header></div>
${motion ? `<script>(function(){var s=document.getElementById('hero-scroll');var l=document.querySelector('[data-fs-motion=images-left]');var r=document.querySelector('[data-fs-motion=images-right]');
var mq=matchMedia('(prefers-reduced-motion: reduce)');
function u(){if(mq.matches){l.style.transform='';r.style.transform='';return;}var t=s.getBoundingClientRect().top+scrollY;var p=Math.min(1,Math.max(0,(scrollY-t)/(s.offsetHeight-innerHeight)));l.style.transform='translateY('+(-p*20*l.offsetHeight/100).toFixed(2)+'px)';r.style.transform='translateY('+(p*20*r.offsetHeight/100).toFixed(2)+'px)';}
addEventListener('scroll',u,{passive:true});addEventListener('resize',u);u();})();</script>` : ''}`;
}
function layout620(variant) {
  const d = copy.layout620;
  return `<section class="section"${idAttr(variant, 'fs.section.features.desktop')}><div class="container">
<p>${esc(d.tagline)}</p><h2>${esc(d.heading)}</h2><p style="margin-top:16px">${esc(d.description)}</p>
<div class="feat">${d.items.map((i) => `<div><div class="icon"></div><h3>${esc(i.heading)}</h3><p>${esc(i.description)}</p></div>`).join('')}</div>
<div class="row" style="margin-top:32px">${btn(variant, 'secondary', 'Button')}<a class="lnk" href="#">Button</a></div></div></section>`;
}
function testimonial37(variant) {
  const d = copy.testimonial37;
  return `<section class="section"${idAttr(variant, 'fs.section.testimonials.desktop')}><div class="container"><h2>${esc(d.heading)}</h2><p style="margin-top:16px">${esc(d.description)}</p>
<div class="grid">${d.cards.map((c) => c.kind === 'logo' ? '<div class="card"><div style="width:120px;height:48px;background:#000"></div></div>'
    : `<div class="card"><blockquote style="margin:0">${esc(c.quote)}</blockquote><p>${esc(c.name)}</p></div>`).join('')}</div></div></section>`;
}
function cta25(variant) {
  const d = copy.cta25;
  return `<section class="section"${idAttr(variant, 'fs.section.cta.desktop')}><div class="container"><h2>${esc(d.heading)}</h2><p style="margin:16px 0">${esc(d.description)}</p><div class="row">${btn(variant, 'primary', 'Button')}${btn(variant, 'secondary', 'Button')}</div></div></section>`;
}

export function renderRoute(route, variant, bp) {
  let body;
  const subj = (name, inner) => `<div data-fs-subject="${name}"${idAttr(variant, 'fs.subject.' + name)}>${inner}</div>`;
  switch (route) {
    case 'button': body = subj('button', `<div style="max-width:1440px;margin:0 auto;padding:80px"><div class="row" style="gap:16px">${btn(variant, 'primary', 'Button')}${btn(variant, 'secondary', 'Button')}</div></div>`); break;
    case 'navbar': body = subj('navbar', navbar(variant)); break;
    case 'header80': body = subj('header80', header80(variant)); break;
    case 'layout620': body = subj('layout620', layout620(variant)); break;
    case 'testimonial37': body = subj('testimonial37', testimonial37(variant)); break;
    case 'cta25': body = subj('cta25', cta25(variant)); break;
    case 'page': body = subj('page', navbar(variant) + header80(variant) + layout620(variant) + testimonial37(variant) + cta25(variant)); break;
    default: return null;
  }
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>stub ${route}</title>
<link rel="stylesheet" href="/fonts/source-sans-3.css"><style>${css(variant)}</style></head><body data-bp="${esc(bp || '')}">${body}</body></html>`;
}

export function startStub({ port, variant, name }) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    requests.push(req.url);
    if (u.pathname.startsWith('/fonts/')) {
      const f = path.join(INPUTS_DIR, 'fonts', path.basename(u.pathname));
      if (fs.existsSync(f)) {
        const ext = path.extname(f);
        res.writeHead(200, { 'content-type': ext === '.css' ? 'text/css' : 'font/woff2' });
        return res.end(fs.readFileSync(f));
      }
      res.writeHead(404); return res.end();
    }
    const route = u.pathname.replace(/^\/+|\/+$/g, '') || 'page';
    const html = renderRoute(route, variant, u.searchParams.get('bp'));
    if (!html) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({
      name, port, requests,
      stop: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
    }));
  });
}
