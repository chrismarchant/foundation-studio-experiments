/**
 * Deterministic generator for PEN-CLOUD-03-B Arm C.
 *
 *   tsx generator/generate.ts            write app/src/generated/**, app/public/fonts, ssr/public/fonts
 *   tsx generator/generate.ts --verify   regenerate into a temp dir and diff against the tree (exit 1 on any difference)
 *
 * Reads exactly: the DSC, the SAC, the Penpot structure observations, copy.json and the font files.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitButton } from "./emit/button.ts";
import { emitConflicts } from "./emit/conflicts.ts";
import { emitCta } from "./emit/cta.ts";
import { emitFeatures } from "./emit/features.ts";
import { emitHero } from "./emit/hero.ts";
import { emitNavbar } from "./emit/navbar.ts";
import { emitRoutes } from "./emit/routes.ts";
import { emitBase, emitCopy, emitRuntime, emitTokens } from "./emit/static.ts";
import { emitTestimonials } from "./emit/testimonials.ts";
import { makeCtx, type OutFile } from "./lib/ctx.ts";
import { GENERATED_HEADER_CSS, GENERATED_HEADER_TS, readJson, sha256, stableJson } from "./lib/io.ts";
import { Obs } from "./lib/obs.ts";
import { SacIndex } from "./lib/sac.ts";
import { cssVarName, TokenSet } from "./lib/tokens.ts";
import type { Copy, Dsc, PenStructure, Sac } from "./lib/types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const INPUT_DIR = resolve(ROOT, "../inputs");

const DEFAULT_DSC = "dsc/fs.ds.relume-default.r1.json";
const DEFAULT_STRUCTURE = "penpot/structure.json";

/** CLI/env option `--<name> <path relative to ../inputs>`; falls back to the env var, then the default. */
function selectedInput(name: string, env: string, fallback: string): string {
  const argv = process.argv;
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i >= 0) {
    const a = argv[i] as string;
    const v = a.includes("=") ? a.slice(a.indexOf("=") + 1) : argv[i + 1];
    if (!v) throw new Error(`--${name} requires a path relative to ../inputs`);
    return v;
  }
  return process.env[env] || fallback;
}

/** DSC selection (C-R2-01): `--dsc <path>` or FS_DSC; default stays r1. */
const selectedDsc = (): string => selectedInput("dsc", "FS_DSC", DEFAULT_DSC);
/** Observation selection (C-R4-00): `--structure <path>` or FS_STRUCTURE; default stays the original observations. */
const selectedStructure = (): string => selectedInput("structure", "FS_STRUCTURE", DEFAULT_STRUCTURE);

const INPUT_FILES = {
  dsc: selectedDsc(),
  sac: "sac/landing-sac.json",
  structure: selectedStructure(),
  copy: "copy.json",
} as const;

/** Trees owned by the generator (verify diffs exactly these). */
const OWNED_TREES = ["app/src/generated", "app/public/fonts", "ssr/public/fonts"] as const;
const MANIFEST_PATH = "app/src/generated/generated-manifest.json";

function listFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(relative(base, p).split("\\").join("/"));
  }
  return out;
}

function build(): OutFile[] {
  const dscPath = join(INPUT_DIR, INPUT_FILES.dsc);
  const dsc = readJson<Dsc>(dscPath);
  const sacRaw = readJson<Sac>(join(INPUT_DIR, INPUT_FILES.sac));
  const structure = readJson<PenStructure>(join(INPUT_DIR, INPUT_FILES.structure));
  const copy = readJson<Copy>(join(INPUT_DIR, INPUT_FILES.copy));

  const ctx = makeCtx({
    dsc,
    tokens: new TokenSet(dsc.tokens.entries),
    sac: new SacIndex(sacRaw),
    obs: new Obs(structure),
    copy,
    header: { ts: GENERATED_HEADER_TS, css: GENERATED_HEADER_CSS },
  });

  emitTokens(ctx);
  emitCopy(ctx);
  emitRuntime(ctx);
  emitBase(ctx);
  emitButton(ctx);
  emitNavbar(ctx);
  emitHero(ctx);
  emitFeatures(ctx);
  emitTestimonials(ctx);
  emitCta(ctx);
  emitRoutes(ctx);
  emitConflicts(ctx);

  // Every SAC annotation must have been consumed by a generated element.
  const unconsumed = ctx.sac.all().filter((a) => !ctx.sac.consumed.has(a.logicalId));
  if (unconsumed.length) {
    throw new Error(`Unmapped SAC annotations: ${unconsumed.map((a) => a.logicalId).join(", ")}`);
  }

  scanGovernedProperties(
    ctx.files,
    ctx.ungov.list().map((u) => `${u.file}|${u.value}`),
  );

  // Fonts: copied byte-for-byte, integrity-checked against the font MANIFEST.
  const fontDir = join(INPUT_DIR, "fonts");
  const fontManifest = readJson<{ files: Record<string, string> }>(join(fontDir, "MANIFEST.json"));
  const fontFiles = [...Object.keys(fontManifest.files).sort(), "source-sans-3.css"];
  const inputHashes: Record<string, string> = {};
  for (const [k, rel] of Object.entries(INPUT_FILES)) {
    void k;
    inputHashes[`../inputs/${rel}`] = sha256(readFileSync(join(INPUT_DIR, rel)));
  }
  inputHashes["../inputs/fonts/MANIFEST.json"] = sha256(readFileSync(join(fontDir, "MANIFEST.json")));
  for (const f of fontFiles) {
    const bytes = readFileSync(join(fontDir, f));
    const h = sha256(bytes);
    inputHashes[`../inputs/fonts/${f}`] = h;
    const expected = fontManifest.files[f];
    if (expected && expected !== h) throw new Error(`Font ${f} sha256 differs from fonts/MANIFEST.json`);
    for (const tree of ["app/public/fonts", "ssr/public/fonts"]) {
      ctx.files.push({ path: `${tree}/${f}`, content: new Uint8Array(bytes) });
    }
  }

  // Manifest.
  const genFiles = listFiles(HERE)
    .filter((f) => f.endsWith(".ts"))
    .sort();
  const generatorHashes: Record<string, string> = {};
  for (const f of genFiles) generatorHashes[`generator/${f}`] = sha256(readFileSync(join(HERE, f)));
  generatorHashes["generator/tsconfig.json"] = sha256(readFileSync(join(HERE, "tsconfig.json")));

  const files = [...ctx.files]
    .sort((a, b) => (a.path < b.path ? -1 : 1))
    .map((f) => ({ path: f.path, sha256: sha256(f.content) }));

  const used: Record<string, string[]> = {};
  for (const [file, set] of [...ctx.tokens.used.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    used[file] = [...set].sort();
  }
  const allTokenIds = ctx.tokens.entries.map((e) => e.id);
  const usedIds = new Set([...ctx.tokens.used.values()].flatMap((s) => [...s]));
  const manifest = {
    schema: "arm-c/generated-manifest/1",
    dsc: { id: dsc.id, revision: dsc.revision, version: dsc.dsc },
    inputs: inputHashes,
    generator: generatorHashes,
    files,
    tokens: {
      count: allTokenIds.length,
      cssVars: ctx.tokens.entries.map((e) => cssVarName(e.id)),
      tokensCss: "tokens.css declares every DSC token; tokens.ts exports them typed",
      referencedByComponents: used,
      declaredButUnreferenced: allTokenIds.filter((i) => !usedIds.has(i)),
    },
    sac: {
      annotations: ctx.sac.all().length,
      consumed: ctx.sac.consumed.size,
    },
    ungoverned: ctx.ungov.list(),
    designObservationVsIntent: ctx.conflicts.sort((a, b) => (a.id < b.id ? -1 : 1)),
  };
  ctx.files.push({ path: MANIFEST_PATH, content: stableJson(manifest) });
  return ctx.files;
}

/**
 * Self-check of the token-integrity rule on the generated CSS: DSC-governed properties must
 * be var(--fs-*) and every remaining length literal must be registered as ungoverned.
 */
function scanGovernedProperties(files: OutFile[], registered: string[]): void {
  const mustBeVar = [
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "font-family",
    "border-radius",
    "color",
    "background",
    "border-color",
  ];
  const okKeywords = new Set(["transparent", "inherit", "none", "0", "currentcolor"]);
  const problems: string[] = [];
  for (const f of files) {
    if (!f.path.endsWith(".css") || typeof f.content !== "string") continue;
    if (f.path.endsWith("tokens.css")) continue;
    const name = f.path.split("/").pop() as string;
    let skip = false;
    for (const rawLine of f.content.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith(".fs-sr-only")) skip = true;
      if (skip) {
        if (line === "}") skip = false;
        continue;
      }
      const m = line.match(/^([a-z-]+):\s*(.+);$/);
      if (!m) continue;
      const prop = m[1] as string;
      const val = m[2] as string;
      if (/#[0-9a-fA-F]{3,8}\b/.test(val)) problems.push(`${name}: hex literal in ${prop}: ${val}`);
      if (mustBeVar.includes(prop) && !val.startsWith("var(--fs-") && !okKeywords.has(val)) {
        problems.push(`${name}: ${prop} is not token-bound: ${val}`);
      }
      const stripped = val.replace(/var\([^)]*\)/g, "");
      for (const lit of stripped.match(/-?\d*\.?\d+(?:px|vw|vh|rem|%)/g) ?? []) {
        if (lit === "100%" || lit === "0px") continue;
        const ok =
          registered.some((r) => r.startsWith(`${name}|`) && r.includes(lit)) ||
          prop === "grid-template-columns" ||
          prop === "grid-template-rows" ||
          prop === "grid-column";
        if (!ok) problems.push(`${name}: unregistered literal ${lit} in ${prop}: ${val}`);
      }
    }
  }
  if (problems.length) throw new Error(`Token-integrity scan failed:\n  ${problems.join("\n  ")}`);
}

function writeAll(outRoot: string, files: OutFile[]): void {
  for (const f of files) {
    const p = join(outRoot, f.path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.content);
  }
}

function cleanOwned(outRoot: string): void {
  for (const tree of OWNED_TREES) rmSync(join(outRoot, tree), { recursive: true, force: true });
}

function verify(files: OutFile[]): number {
  const tmp = mkdtempSync(join(tmpdir(), "armc-verify-"));
  try {
    writeAll(tmp, files);
    const problems: string[] = [];
    for (const tree of OWNED_TREES) {
      const a = new Set(listFiles(join(tmp, tree)));
      const b = new Set(listFiles(join(ROOT, tree)));
      for (const f of [...a].sort()) {
        if (!b.has(f)) problems.push(`missing in tree: ${tree}/${f}`);
        else if (!readFileSync(join(tmp, tree, f)).equals(readFileSync(join(ROOT, tree, f)))) {
          problems.push(`differs: ${tree}/${f}`);
        }
      }
      for (const f of [...b].sort()) if (!a.has(f)) problems.push(`unexpected in tree: ${tree}/${f}`);
    }
    if (problems.length) {
      console.error(`generate:verify FAILED\n  ${problems.join("\n  ")}`);
      return 1;
    }
    console.log(`generate:verify OK (${files.length} files identical)`);
    return 0;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const files = build();
if (process.argv.includes("--verify")) {
  process.exit(verify(files));
} else {
  cleanOwned(ROOT);
  writeAll(ROOT, files);
  console.log(`generated ${files.length} files`);
}
