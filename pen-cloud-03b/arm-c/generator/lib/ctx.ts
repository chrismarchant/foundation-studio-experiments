import { Css, Ungoverned } from "./css.ts";
import type { Obs } from "./obs.ts";
import type { SacIndex } from "./sac.ts";
import { type TokenSet, breakpointOrder } from "./tokens.ts";
import type { Copy, Dsc, DscComponent } from "./types.ts";

export interface OutFile {
  /** path relative to the output root, e.g. `app/src/generated/Hero.tsx` */
  path: string;
  content: string;
}

export interface Ctx {
  dsc: Dsc;
  tokens: TokenSet;
  sac: SacIndex;
  obs: Obs;
  copy: Copy;
  ungov: Ungoverned;
  header: { ts: string; css: string };
  files: OutFile[];
  comp(id: string): DscComponent;
  /** token bound by the DSC to `property` on component `id` */
  bound(file: string, compId: string, property: string): string;
  newCss(): Css;
  /** register and return a literal for geometry the DSC does not govern by token */
  lit(file: string, property: string, value: string, reason: string, source: string): string;
  /** spacing token ref when a token equals `px`, else registered literal */
  sp(file: string, property: string, px: number, source: string): string;
}

export function makeCtx(base: Omit<Ctx, "comp" | "bound" | "newCss" | "lit" | "sp" | "files" | "ungov">): Ctx {
  const ungov = new Ungoverned();
  const ctx: Ctx = {
    ...base,
    ungov,
    files: [],
    comp(id) {
      const c = base.dsc.components.find((x) => x.id === id);
      if (!c) throw new Error(`DSC component ${id} missing`);
      return c;
    },
    bound(file, compId, property) {
      const b = ctx.comp(compId).bindings.find((x) => x.property === property);
      if (!b) throw new Error(`DSC binding ${compId}.${property} missing`);
      return base.tokens.ref(file, b.token);
    },
    newCss() {
      return new Css(base.header.css, breakpointOrder(base.dsc.breakpoints));
    },
    lit(file, property, value, reason, source) {
      ungov.add({ file, property, value, reason, source });
      return value;
    },
    sp(file, property, px, source) {
      const t = base.tokens.spacingFor(px);
      if (t) return base.tokens.ref(file, t.id);
      return ctx.lit(file, property, `${px}px`, "no spacing token equals this observed value", source);
    },
  };
  return ctx;
}
