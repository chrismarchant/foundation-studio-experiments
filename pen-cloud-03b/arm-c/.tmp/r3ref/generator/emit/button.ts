import type { Ctx } from "../lib/ctx.ts";
import { emit, emitCss, OUT } from "../lib/emitutil.ts";

export function emitButton(ctx: Ctx): void {
  const F = "Button.css";
  const primary = ctx.comp("fs.component.button.primary");
  const secondary = ctx.comp("fs.component.button.secondary");
  const geo = primary.geometry;
  if (!geo) throw new Error("Button geometry missing in DSC");
  const src = "dsc:fs.component.button.*.geometry";
  const px = (prop: string, v: number | undefined) => {
    if (v === undefined) throw new Error(`Button geometry ${prop} missing`);
    return ctx.lit(F, prop, `${v}px`, "DSC component geometry (not tokenised)", src);
  };
  for (const k of ["height", "paddingX", "gap", "strokeWidth"] as const) {
    if (secondary.geometry?.[k] !== geo[k]) throw new Error(`Button primary/secondary geometry differs: ${k}`);
  }

  const css = ctx.newCss();
  const bP = (p: string) => ctx.bound(F, primary.id, p);
  const bS = (p: string) => ctx.bound(F, secondary.id, p);
  css.rule("base", ".fs-button", {
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    gap: px("gap", geo.gap),
    height: px("height", geo.height),
    padding: `0 ${px("padding-inline", geo.paddingX)}`,
    "box-sizing": "border-box",
    border: `${px("border-width", geo.strokeWidth)} solid ${bP("strokeColor")}`,
    "border-radius": bP("borderRadius"),
    "font-family": ctx.tokens.ref(F, "font.family.sans"),
    "font-size": bP("labelFontSize"),
    "font-weight": ctx.tokens.ref(F, "font.weight.regular"),
    "line-height": ctx.tokens.ref(F, "font.lineHeight.body"),
    "white-space": "nowrap",
    cursor: "pointer",
  });
  css.rule("base", ".fs-button--primary", { background: bP("fill"), color: bP("labelFill") });
  if (bS("borderRadius") !== bP("borderRadius") || bS("strokeColor") !== bP("strokeColor")) {
    throw new Error("Button variants bind different border tokens; generator assumes shared");
  }
  css.rule("base", ".fs-button--secondary", { background: bS("fill"), color: bS("labelFill") });
  emitCss(ctx, `${OUT}/Button.css`, css);

  const main = (c: { external: { penpot?: Record<string, string> } }) => {
    const id = c.external.penpot?.mainShapeId;
    if (!id) throw new Error("Button mainShapeId missing");
    return id;
  };

  emit(
    ctx,
    `${OUT}/Button.tsx`,
    `${ctx.header.ts}import type { ButtonHTMLAttributes } from "react";
import { type FsMeta, fsAttrs } from "./runtime";
import "./tokens.css";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary";

const DEFAULT_META = {
  primary: {
    id: ${JSON.stringify(primary.id)},
    component: ${JSON.stringify(primary.id)},
    penpot: ${JSON.stringify(main(primary))},
  },
  secondary: {
    id: ${JSON.stringify(secondary.id)},
    component: ${JSON.stringify(secondary.id)},
    penpot: ${JSON.stringify(main(secondary))},
  },
} as const satisfies Record<ButtonVariant, FsMeta>;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant: ButtonVariant;
  /** Identity of this instance (SAC logicalId, bbc, Penpot instance id). Defaults to the DSC component. */
  fs?: FsMeta;
}

export function Button({ variant, fs, className, children, ...rest }: ButtonProps) {
  const meta: FsMeta = fs ?? DEFAULT_META[variant];
  const classes = ["fs-button", "fs-button--" + variant, className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} {...fsAttrs(meta)} {...rest}>
      {children}
    </button>
  );
}
`,
  );
}
