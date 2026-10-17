// Minimal Node server for the TanStack Start production build (dist/server/server.js exports a fetch handler).
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const clientDir = resolve(root, "dist/client");
const port = Number(process.env.PORT ?? 4305);
const host = process.env.HOST ?? "127.0.0.1";

const { default: app } = await import(pathToFileURL(join(root, "dist/server/server.js")).href);

const TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function serveStatic(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
  const file = resolve(clientDir, rel);
  if (!rel || !file.startsWith(clientDir) || !existsSync(file) || !statSync(file).isFile()) return false;
  const immutable = rel.startsWith("assets/");
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "content-length": statSync(file).size,
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=0",
  });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    if ((req.method === "GET" || req.method === "HEAD") && serveStatic(req, res)) return;
    const origin = `http://${req.headers.host ?? `${host}:${port}`}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) for (const x of v) headers.append(k, x);
      else if (v !== undefined) headers.set(k, v);
    }
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(new URL(req.url ?? "/", origin), {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const response = await app.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body || req.method === "HEAD") res.end();
    else Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => console.log(`Arm C SSR listening on http://${host}:${port}`));
