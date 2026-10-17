import type { Bp, DscBreakpoint, DscToken } from "./types.ts";

/** `fs.token.color.scheme.btn-text` -> `--fs-color-scheme-btn-text` */
export function cssVarName(id: string): string {
  if (!id.startsWith("fs.token.")) throw new Error(`Not a token id: ${id}`);
  return `--fs-${id.slice("fs.token.".length).replace(/\./g, "-")}`;
}

export function shortName(id: string): string {
  return id.slice("fs.token.".length);
}

export class TokenSet {
  readonly entries: DscToken[];
  readonly byId = new Map<string, DscToken>();
  readonly used = new Map<string, Set<string>>();

  constructor(entries: DscToken[]) {
    this.entries = [...entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const vars = new Map<string, string>();
    for (const e of this.entries) {
      if (this.byId.has(e.id)) throw new Error(`Duplicate token ${e.id}`);
      this.byId.set(e.id, e);
      const v = cssVarName(e.id);
      if (vars.has(v)) throw new Error(`CSS variable collision ${v}: ${e.id} / ${vars.get(v)}`);
      vars.set(v, e.id);
    }
  }

  get(id: string): DscToken {
    const full = id.startsWith("fs.token.") ? id : `fs.token.${id}`;
    const t = this.byId.get(full);
    if (!t) throw new Error(`Unknown token ${id}`);
    return t;
  }

  /** `var(--fs-...)` for a token (short or full id); records usage for the manifest. */
  ref(file: string, id: string): string {
    const t = this.get(id);
    let set = this.used.get(file);
    if (!set) {
      set = new Set();
      this.used.set(file, set);
    }
    set.add(t.id);
    return `var(${cssVarName(t.id)})`;
  }

  /** Value of a token at a breakpoint (responsive override, else the base/lg value). */
  valueAt(id: string, bp: Bp): string {
    const t = this.get(id);
    if (bp === "lg") return t.value;
    // md falls back to base; sm falls back to md override then base
    if (bp === "md") return t.responsive?.md ?? t.value;
    return t.responsive?.sm ?? t.responsive?.md ?? t.value;
  }

  /** A non-responsive spacing token whose value is exactly `px`, if any. */
  spacingFor(px: number): DscToken | undefined {
    return this.entries.find((e) => e.type === "spacing" && !e.responsive && e.value === `${px}px`);
  }
}

export function breakpointOrder(bps: DscBreakpoint[]): DscBreakpoint[] {
  return [...bps].sort((a, b) => b.minWidth - a.minWidth); // lg, md, sm
}

export function emitTokensCss(ts: TokenSet, bps: DscBreakpoint[], header: string): string {
  const ordered = breakpointOrder(bps);
  const lg = ordered[0];
  const md = ordered[1];
  if (!lg || !md) throw new Error("Expected lg/md/sm breakpoints");
  const out: string[] = [header];
  out.push(":root {");
  for (const e of ts.entries) out.push(`  ${cssVarName(e.id)}: ${e.value};`);
  out.push(`  --fs-layout-container-max: ${lg.container}px;`);
  out.push(`  --fs-layout-side-padding: ${lg.sidePadding};`);
  out.push("}");
  // Desktop-first token overrides, one @media per non-base breakpoint, widest first.
  // A breakpoint applies from its own minWidth downwards until the next lower one overrides it.
  for (let i = 1; i < ordered.length; i++) {
    const bp = ordered[i];
    const upper = ordered[i - 1];
    if (!bp || !upper) continue;
    const decls = ts.entries.filter((e) => e.responsive && e.responsive[bp.id] !== undefined);
    out.push("");
    out.push(`/* ${bp.id}: below ${upper.minWidth}px (canvas ${bp.canvas}) */`);
    out.push(`@media (max-width: ${upper.minWidth - 0.02}px) {`);
    out.push("  :root {");
    for (const e of decls) out.push(`    ${cssVarName(e.id)}: ${e.responsive?.[bp.id]};`);
    if (bp.sidePadding !== lg.sidePadding) {
      out.push(`    --fs-layout-side-padding: ${bp.sidePadding};`);
    }
    out.push("  }");
    out.push("}");
  }
  return `${out.join("\n")}\n`;
}

export function emitTokensTs(ts: TokenSet, bps: DscBreakpoint[], revision: string, header: string): string {
  const ordered = breakpointOrder(bps);
  const o: string[] = [header];
  o.push("export interface FsToken {");
  o.push("  readonly id: string;");
  o.push("  readonly type: string;");
  o.push("  readonly value: string;");
  o.push("  readonly cssVar: string;");
  o.push("  readonly responsive?: Readonly<Record<string, string>>;");
  o.push("}");
  o.push("");
  o.push("export const tokens = {");
  for (const e of ts.entries) {
    const short = shortName(e.id);
    const resp = e.responsive
      ? `, responsive: ${JSON.stringify(Object.fromEntries(Object.entries(e.responsive).sort(([a], [b]) => (a < b ? -1 : 1))))}`
      : "";
    o.push(
      `  ${JSON.stringify(short)}: { id: ${JSON.stringify(e.id)}, type: ${JSON.stringify(e.type)}, value: ${JSON.stringify(e.value)}, cssVar: ${JSON.stringify(cssVarName(e.id))}${resp} },`,
    );
  }
  o.push("} as const satisfies Record<string, FsToken>;");
  o.push("");
  o.push("export type FsTokenName = keyof typeof tokens;");
  o.push("");
  o.push("export function tokenVar(name: FsTokenName): string {");
  // biome-ignore lint/suspicious/noTemplateCurlyInString: emitting source text
  o.push("  return `var(${tokens[name].cssVar})`;");
  o.push("}");
  o.push("");
  o.push("export const breakpoints = [");
  for (const b of ordered) {
    o.push(
      `  { id: ${JSON.stringify(b.id)}, minWidth: ${b.minWidth}, canvas: ${b.canvas}, container: ${b.container}, sidePadding: ${JSON.stringify(b.sidePadding)} },`,
    );
  }
  o.push("] as const;");
  o.push("");
  o.push(`export const dscRevision = ${JSON.stringify(revision)};`);
  return `${o.join("\n")}\n`;
}
