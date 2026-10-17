import type { Bp, DscBreakpoint, PerBp } from "./types.ts";

export interface UngovernedEntry {
  file: string;
  property: string;
  value: string;
  reason: string;
  source: string;
}

export class Ungoverned {
  private readonly map = new Map<string, UngovernedEntry>();
  add(e: UngovernedEntry): void {
    this.map.set(`${e.file}|${e.property}|${e.value}|${e.reason}`, e);
  }
  list(): UngovernedEntry[] {
    return [...this.map.values()].sort((a, b) => {
      const ka = `${a.file}|${a.property}|${a.value}|${a.reason}`;
      const kb = `${b.file}|${b.property}|${b.value}|${b.reason}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }
}

type Decls = Map<string, string>;
type Layer = "base" | "md" | "lg";

/** Mobile-first stylesheet builder: base = sm, then md and lg layers from the DSC breakpoints. */
export class Css {
  private readonly layers: Record<Layer, Map<string, Decls>> = {
    base: new Map(),
    md: new Map(),
    lg: new Map(),
  };
  private readonly extra: string[] = [];

  constructor(
    private readonly header: string,
    private readonly bps: DscBreakpoint[],
  ) {}

  private minWidth(id: "md" | "lg"): number {
    const b = this.bps.find((x) => x.id === id);
    if (!b) throw new Error(`Breakpoint ${id} missing`);
    return b.minWidth;
  }

  rule(layer: Layer, selector: string, decls: Record<string, string | undefined>): void {
    let sel = this.layers[layer].get(selector);
    if (!sel) {
      sel = new Map();
      this.layers[layer].set(selector, sel);
    }
    for (const [k, v] of Object.entries(decls)) {
      if (v !== undefined) sel.set(k, v);
    }
  }

  /** A property whose value differs per breakpoint; emits only the layers where it changes. */
  resp<T>(selector: string, prop: string, vals: PerBp<T>, render: (v: T) => string): void {
    const sm = render(vals.sm);
    const md = render(vals.md);
    const lg = render(vals.lg);
    this.rule("base", selector, { [prop]: sm });
    if (md !== sm) this.rule("md", selector, { [prop]: md });
    if (lg !== md) this.rule("lg", selector, { [prop]: lg });
  }

  /** Raw block appended after the layered rules (e.g. reduced-motion). */
  raw(block: string): void {
    this.extra.push(block);
  }

  private block(sel: string, d: Decls, indent: string): string[] {
    const out = [`${indent}${sel} {`];
    for (const [k, v] of d) out.push(`${indent}  ${k}: ${v};`);
    out.push(`${indent}}`);
    return out;
  }

  render(): string {
    const out: string[] = [this.header.trimEnd()];
    const base = this.layers.base;
    if (base.size) out.push("");
    for (const [sel, d] of base) out.push(...this.block(sel, d, ""));
    for (const layer of ["md", "lg"] as const) {
      const rules = this.layers[layer];
      if (!rules.size) continue;
      out.push("");
      out.push(`@media (min-width: ${this.minWidth(layer)}px) {`);
      let first = true;
      for (const [sel, d] of rules) {
        if (!first) out.push("");
        first = false;
        out.push(...this.block(sel, d, "  "));
      }
      out.push("}");
    }
    for (const e of this.extra) {
      out.push("");
      out.push(e.trimEnd());
    }
    return `${out.join("\n")}\n`;
  }
}

export function perBp<T>(f: (bp: Bp) => T): PerBp<T> {
  return { lg: f("lg"), md: f("md"), sm: f("sm") };
}
