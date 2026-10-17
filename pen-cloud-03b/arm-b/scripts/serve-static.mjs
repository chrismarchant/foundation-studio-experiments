// Arm B static server: sirv (pinned) over static/, port 4302.
// Variant selection: `/route?bp=tablet|mobile` is rewritten internally to `/route.tablet|.mobile`
// (which sirv resolves to route.tablet.html / route.mobile.html). Anything else serves route.html (desktop).
// Files are also directly addressable: /navbar.tablet.html.
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 4302);
const serve = sirv(join(ROOT, 'static'), { extensions: ['html'], etag: true, dev: false });

http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const bp = u.searchParams.get('bp');
    if ((bp === 'tablet' || bp === 'mobile') && /^\/[a-z0-9]+$/.test(u.pathname)) {
      req.url = `${u.pathname}.${bp}`;
    }
    serve(req, res, () => {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Not found');
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Arm B static on http://127.0.0.1:${PORT}/`));
