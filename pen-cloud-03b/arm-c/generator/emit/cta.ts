import type { Ctx } from "../lib/ctx.ts";
import { BODY, emit, emitCss, fsConst, HEADING, OUT, typo } from "../lib/emitutil.ts";

export function emitCta(ctx: Ctx): void {
  const F = "Cta.css";
  const id = "fs.section.cta";
  const dsc = ctx.comp(id);
  const SEC = "Cta25";
  const o = ctx.obs;
  const src = (s: string) => `penpot-structure:${SEC}>${s}`;

  const root = ctx.sac.meta("fs.section.cta.desktop", id);
  const h2 = ctx.sac.meta("fs.section.cta.desktop.h2");
  const prim = ctx.sac.meta("fs.section.cta.desktop.cta-primary");
  const sec = ctx.sac.meta("fs.section.cta.desktop.cta-secondary");
  if (root.tag !== "section") throw new Error("Expected cta-section -> <section>");
  if (root.penpot !== dsc.external.penpot?.desktop)
    throw new Error("CTA Penpot desktop id differs between DSC and SAC");

  const css = ctx.newCss();
  const text = ctx.tokens.ref(F, "color.scheme.text");
  const sp = (prop: string, s: string) => (v: number) => ctx.sp(F, prop, v, src(s));
  css.rule("base", ".fs-cta", {
    background: ctx.bound(F, id, "background"),
    color: text,
    "padding-top": ctx.bound(F, id, "paddingTop"),
    "padding-bottom": ctx.bound(F, id, "paddingBottom"),
    "padding-inline": "var(--fs-layout-side-padding)",
  });
  css.rule("base", ".fs-cta__container", {
    "max-width": "var(--fs-layout-container-max)",
    "margin-inline": "auto",
  });
  css.rule("base", ".fs-cta__content", {
    // DSC-R4-01: bound text column; r1-r3 DSCs keep the observation
    "max-width": ctx.hasBinding(id, "textColumnMaxWidth")
      ? ctx.bound(F, id, "textColumnMaxWidth")
      : ctx.lit(
          F,
          "max-width",
          `${o.width("lg", SEC, "Container")}px`,
          "CTA text column width (observation)",
          src("Container.w"),
        ),
    "margin-inline": "auto",
    "text-align": "center",
  });
  css.rule("base", ".fs-cta__heading", typo(ctx, F, HEADING(), ctx.bound(F, id, "headingFontSize")));
  css.resp(
    ".fs-cta__description",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Container > Space", 0)),
    sp("margin-top", "Container>Space[0].h"),
  );
  css.rule(
    "base",
    ".fs-cta__description",
    typo(ctx, F, BODY("font.size.medium"), ctx.bound(F, id, "descriptionFontSize")),
  );
  css.rule("base", ".fs-cta__actions", {
    display: "flex",
    "justify-content": "center",
    gap: ctx.bound(F, id, "buttonGap"),
  });
  css.resp(
    ".fs-cta__actions",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Container > Space", 1)),
    sp("margin-top", "Container>Space[1].h"),
  );
  emitCss(ctx, `${OUT}/Cta.css`, css);

  emit(
    ctx,
    `${OUT}/Cta.tsx`,
    `${ctx.header.ts}import { Button } from "./Button";
import { copy } from "./copy";
import { type FsMeta, fsAttrs } from "./runtime";
import "./tokens.css";
import "./Cta.css";

${fsConst({ root, h2, ctaPrimary: prim, ctaSecondary: sec })}

export interface CtaProps {
  subject?: string;
}

export function Cta({ subject }: CtaProps) {
  return (
    <${root.tag}
      className="fs-cta"
      aria-labelledby="fs-cta-heading"
      data-fs-subject={subject}
      {...fsAttrs(FS.root)}
    >
      <div className="fs-cta__container">
        <div className="fs-cta__content">
          <${h2.tag} id="fs-cta-heading" className="fs-cta__heading" {...fsAttrs(FS.h2)}>
            {copy.cta25.heading}
          </${h2.tag}>
          <p className="fs-cta__description">{copy.cta25.description}</p>
          <div className="fs-cta__actions">
            {copy.cta25.buttons.map((b) => (
              <Button
                key={b.variant}
                variant={b.variant}
                fs={b.variant === "primary" ? FS.ctaPrimary : FS.ctaSecondary}
              >
                {b.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </${root.tag}>
  );
}
`,
  );
}
