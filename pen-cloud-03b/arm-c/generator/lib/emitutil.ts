import type { Ctx } from "./ctx.ts";
import type { Css } from "./css.ts";
import type { FsMeta } from "./sac.ts";

const KEYS: (keyof FsMeta)[] = [
  "id",
  "component",
  "penpot",
  "bbc",
  "idTablet",
  "idMobile",
  "penpotTablet",
  "penpotMobile",
];

export function fsConst(table: Record<string, FsMeta>): string {
  const lines = ["const FS = {"];
  for (const name of Object.keys(table).sort()) {
    const m = table[name] as FsMeta;
    const parts = KEYS.filter((k) => m[k] !== undefined).map((k) => `${k}: ${JSON.stringify(m[k])}`);
    lines.push(`  ${name}: { ${parts.join(", ")} },`);
  }
  lines.push("} as const satisfies Record<string, FsMeta>;");
  return lines.join("\n");
}

export interface TypoSpec {
  size: string;
  weight: string;
  lineHeight: string;
  letterSpacing?: string;
}

/** Typography declarations, all through DSC tokens. `size` may be a pre-resolved binding. */
export function typo(ctx: Ctx, file: string, spec: TypoSpec, sizeRef?: string): Record<string, string> {
  const d: Record<string, string> = {
    "font-size": sizeRef ?? ctx.tokens.ref(file, spec.size),
    "font-weight": ctx.tokens.ref(file, spec.weight),
    "line-height": ctx.tokens.ref(file, spec.lineHeight),
  };
  if (spec.letterSpacing) d["letter-spacing"] = ctx.tokens.ref(file, spec.letterSpacing);
  return d;
}

export const HEADING = (extra?: Partial<TypoSpec>): TypoSpec => ({
  size: "font.size.h2",
  weight: "font.weight.bold",
  lineHeight: "font.lineHeight.heading",
  letterSpacing: "font.letterSpacing.heading",
  ...extra,
});

export const BODY = (size: string, weight = "font.weight.regular"): TypoSpec => ({
  size,
  weight,
  lineHeight: "font.lineHeight.body",
});

export function emit(ctx: Ctx, path: string, content: string): void {
  ctx.files.push({ path, content });
}

export function emitCss(ctx: Ctx, path: string, css: Css): void {
  emit(ctx, path, css.render());
}

export const OUT = "app/src/generated";

/** Hand-off of a JSX element with a SAC-derived tag. */
export function jsx(tag: string, attrs: string, children: string, indent: string): string {
  return `${indent}<${tag}${attrs ? ` ${attrs}` : ""}>\n${children}\n${indent}</${tag}>`;
}
