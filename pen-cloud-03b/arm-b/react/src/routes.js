// Mechanical wiring: every wrapped/<bp>/<route>.html|.css (output of scripts/wrap.mjs) is imported as a raw string.
const html = import.meta.glob('../../wrapped/*/*.html', { query: '?raw', import: 'default', eager: true });
const css = import.meta.glob('../../wrapped/*/*.css', { query: '?raw', import: 'default', eager: true });
const prelude = Object.values(import.meta.glob('../../wrapped/prelude.css', { query: '?raw', import: 'default', eager: true }))[0];

export const ROUTES = ['button', 'navbar', 'header80', 'layout620', 'testimonial37', 'cta25', 'page'];
export const BPS = ['desktop', 'tablet', 'mobile'];

export function getSection(route, bp) {
  const key = (ext) => `../../wrapped/${bp}/${route}.${ext}`;
  const h = html[key('html')];
  if (h === undefined) return null;
  return { html: h, css: css[key('css')], prelude };
}

export function bpFromSearch(search) {
  const bp = new URLSearchParams(search).get('bp');
  return bp === 'tablet' || bp === 'mobile' ? bp : 'desktop';
}

export function routeFromPath(pathname) {
  const r = pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  return ROUTES.includes(r) ? r : null;
}
