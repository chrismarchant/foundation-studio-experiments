import type { Bp, DscBreakpoint, DscScreen, PerBp } from "./types.ts";

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
/** Mobile-first layers: base (below the first screen) and the DSC screens sm 480 / md 768 / lg 992 / xl 1280. */
export type Layer = "base" | "sm" | "md" | "lg" | "xl";
const LAYER_ORDER: readonly Layer[] = ["base", "sm", "md", "lg", "xl"];

/**
 * Mobile-first stylesheet builder. Layer min-widths come from the DSC `screens` table (r3). The design tiers
 * (`breakpoints`, used by `resp()`) map to layers through their `screen` field: lg -> lg, md -> md, sm -> base.
 * DSC r1/r2 have no `screens`: the md and lg layers then take the tier min-widths, as before.
 */
export class Css {
  private readonly layers: Record<Layer, Map<string, Decls>> = {
    base: new Map(),
    sm: new Map(),
    md: new Map(),
    lg: new Map(),
    xl: new Map(),
  };
  private readonly extra: string[] = [];
  private readonly tierLayer: Record<Bp, Layer>;

  constructor(
    private readonly header: string,
    private readonly bps: DscBreakpoint[],
    private readonly screens?: DscScreen[],
  ) {
    const tier = (id: Bp): DscBreakpoint => {
      const b = bps.find((x) => x.id === id);
      if (!b) throw new Error(`Breakpoint ${id} missing`);
      return b;
    };
    const layerOf = (id: Bp): Layer => {
      const b = tier(id);
      if (!screens) return id === "sm" ? "base" : id;
      if (b.screen === null || b.screen === undefined) return "base";
      const s = screens.find((x) => x.id === b.screen);
      if (!s || !LAYER_ORDER.includes(s.id as Layer)) throw new Error(`Breakpoint ${id}: unknown screen ${b.screen}`);
      if (s.minWidth !== b.minWidth) throw new Error(`Breakpoint ${id} minWidth differs from screen ${s.id}`);
      return s.id as Layer;
    };
    this.tierLayer = { lg: layerOf("lg"), md: layerOf("md"), sm: layerOf("sm") };
  }

  private minWidth(layer: Exclude<Layer, "base">): number {
    if (this.screens) {
      const s = this.screens.find((x) => x.id === layer);
      if (!s) throw new Error(`Screen ${layer} missing`);
      return s.minWidth;
    }
    if (layer !== "md" && layer !== "lg") throw new Error(`Layer ${layer} needs the DSC screens table`);
    const b = this.bps.find((x) => x.id === layer);
    if (!b) throw new Error(`Breakpoint ${layer} missing`);
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
    this.rule(this.tierLayer.sm, selector, { [prop]: sm });
    if (md !== sm) this.rule(this.tierLayer.md, selector, { [prop]: md });
    if (lg !== md) this.rule(this.tierLayer.lg, selector, { [prop]: lg });
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
    for (const layer of LAYER_ORDER.filter((l): l is Exclude<Layer, "base"> => l !== "base")) {
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
