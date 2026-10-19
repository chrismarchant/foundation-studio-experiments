import type { Ctx } from "../lib/ctx.ts";
import { BODY, emit, emitCss, fsConst, HEADING, OUT, typo } from "../lib/emitutil.ts";

export function emitFeatures(ctx: Ctx): void {
  const F = "Features.css";
  const id = "fs.section.features";
  const dsc = ctx.comp(id);
  const SEC = "Layout620";
  const o = ctx.obs;
  const src = (s: string) => `penpot-structure:${SEC}>${s}`;

  const root = ctx.sac.meta("fs.section.features.desktop", id);
  const h2 = ctx.sac.meta("fs.section.features.desktop.h2");
  const [item1, item2, item3] = [1, 2, 3].map((n) => ctx.sac.meta(`fs.section.features.desktop.item${n}.h3`));
  if (!item1 || !item2 || !item3) throw new Error("Expected three feature items");
  const items = [item1, item2, item3];
  const sec = ctx.sac.meta("fs.section.features.desktop.cta-secondary");
  const link = ctx.sac.meta("fs.section.features.desktop.link");
  if (root.tag !== "section") throw new Error("Expected feature-section -> <section>");
  if (link.tag !== "a") throw new Error("Expected link -> <a>");
  if (root.penpot !== dsc.external.penpot?.desktop)
    throw new Error("Features Penpot desktop id differs between DSC and SAC");
  if (items.length !== ctx.copy.layout620.items.length) throw new Error("Feature item count differs from copy");

  const css = ctx.newCss();
  const t = (x: string) => ctx.tokens.ref(F, x);
  const text = t("color.scheme.text");
  const border = ctx.bound(F, id, "dividerColor");
  const px = (prop: string, why: string, s: string) => (v: number) => ctx.lit(F, prop, `${v}px`, why, src(s));
  const sp = (prop: string, s: string) => (v: number) => ctx.sp(F, prop, v, src(s));
  const bw = ctx.lit(F, "border-width", "1px", "divider thickness (task: 1px dividers)", "task:dividers");
  const dark = t("color.neutral.darkest");

  css.rule("base", ".fs-features", {
    background: ctx.bound(F, id, "background"),
    color: text,
    "padding-top": ctx.bound(F, id, "paddingTop"),
    "padding-bottom": ctx.bound(F, id, "paddingBottom"),
    "padding-inline": "var(--fs-layout-side-padding)",
  });
  css.rule("base", ".fs-features__container", {
    "max-width": "var(--fs-layout-container-max)",
    "margin-inline": "auto",
    display: "flex",
    "flex-direction": "column",
  });
  css.resp(
    ".fs-features__container",
    "gap",
    o.perBp((bp) => o.gap(bp, SEC, "Container")),
    px("gap", "container row gap (observation; no DSC token)", "Container.gap"),
  );
  const headerW = o.width("lg", SEC, "Header");
  css.rule("base", ".fs-features__header", {
    // DSC-R4-01: bound text column; r1-r3 DSCs keep the observation
    "max-width": ctx.hasBinding(id, "textColumnMaxWidth")
      ? ctx.bound(F, id, "textColumnMaxWidth")
      : ctx.lit(F, "max-width", `${headerW}px`, "section header column width (observation)", src("Header.w")),
  });
  css.rule("base", ".fs-features__tagline", typo(ctx, F, BODY("font.size.regular", "font.weight.semibold")));
  css.resp(
    ".fs-features__heading",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Header > Space", 0)),
    sp("margin-top", "Header>Space[0].h"),
  );
  css.rule("base", ".fs-features__heading", typo(ctx, F, HEADING(), ctx.bound(F, id, "headingFontSize")));
  css.resp(
    ".fs-features__description",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Header > Space", 1)),
    sp("margin-top", "Header>Space[1].h"),
  );
  css.rule("base", ".fs-features__description", typo(ctx, F, BODY("font.size.medium")));

  // Grid: 1 column at sm (rows ruled by borders), 3 columns with 1px dividers from md.
  css.rule("base", ".fs-features__grid", {
    display: "flex",
    "flex-direction": "column",
    "border-top": `${bw} solid ${border}`,
  });
  css.rule("md", ".fs-features__grid", {
    display: "grid",
    "grid-template-columns": `1fr ${bw} 1fr ${bw} 1fr`,
    "column-gap": ctx.bound(F, id, "gridGap"),
    "border-bottom": `${bw} solid ${border}`,
  });
  css.rule("base", ".fs-features__item", {
    display: "flex",
    "flex-direction": "column",
    "align-items": "flex-start",
    "min-width": "0",
    "border-bottom": `${bw} solid ${border}`,
  });
  css.rule("md", ".fs-features__item", { "border-bottom-width": "0" });
  css.resp(
    ".fs-features__item",
    "padding-block",
    o.perBp((bp) => o.pad(bp, SEC, "Grid > Item1", 0)),
    (v) => `${sp("padding-block", "Grid>Item1.pad")(v)}`,
  );
  css.rule("base", ".fs-features__divider", { display: "none", background: border });
  css.rule("md", ".fs-features__divider", { display: "block" });

  const iw = o.width("lg", SEC, "Grid > Item1 > Icon");
  const ih = o.height("lg", SEC, "Grid > Item1 > Icon");
  css.rule("base", ".fs-features__icon", {
    width: ctx.lit(F, "width", `${iw}px`, "feature icon placeholder (ARM-CONTRACT 48x48)", src("Item1>Icon")),
    height: ctx.lit(F, "height", `${ih}px`, "feature icon placeholder (ARM-CONTRACT 48x48)", src("Item1>Icon")),
    background: dark,
  });
  css.resp(
    ".fs-features__item-heading",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Grid > Item1 > Space", 0)),
    sp("margin-top", "Item1>Space[0].h"),
  );
  css.rule(
    "base",
    ".fs-features__item-heading",
    typo(
      ctx,
      F,
      HEADING({ size: "font.size.h4", lineHeight: "font.lineHeight.h4" }),
      ctx.bound(F, id, "itemHeadingFontSize"),
    ),
  );
  css.resp(
    ".fs-features__item-body",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Grid > Item1 > Space", 1)),
    sp("margin-top", "Item1>Space[1].h"),
  );
  css.rule("base", ".fs-features__item-body", typo(ctx, F, BODY("font.size.regular")));

  css.rule("base", ".fs-features__actions", {
    display: "flex",
    "align-items": "center",
    gap: ctx.sp(F, "gap", o.gap("lg", SEC, "Buttons", 0, 1), src("Buttons.gap")),
  });
  css.rule("base", ".fs-features__link", {
    display: "inline-flex",
    "align-items": "center",
    gap: ctx.lit(F, "gap", "8px", "link label/chevron gap (observation: two spaces in 'Button  ›')", src("LinkButton")),
    color: text,
    "text-decoration": "none",
    ...typo(ctx, F, BODY("font.size.regular")),
  });
  css.rule("base", ".fs-features__link:hover", { "text-decoration": "underline" });
  emitCss(ctx, `${OUT}/Features.css`, css);

  emit(
    ctx,
    `${OUT}/Features.tsx`,
    `${ctx.header.ts}import { Fragment } from "react";
import { Button } from "./Button";
import { copy } from "./copy";
import { type FsMeta, fsAttrs } from "./runtime";
import "./tokens.css";
import "./Features.css";

${fsConst({ root, h2, item1, item2, item3, ctaSecondary: sec, link })}

const ITEM_HEADINGS = [FS.item1, FS.item2, FS.item3] as const;

export interface FeaturesProps {
  subject?: string;
}

export function Features({ subject }: FeaturesProps) {
  return (
    <${root.tag}
      className="fs-features"
      aria-labelledby="fs-features-heading"
      data-fs-subject={subject}
      {...fsAttrs(FS.root)}
    >
      <div className="fs-features__container">
        <div className="fs-features__header">
          <p className="fs-features__tagline">{copy.layout620.tagline}</p>
          <${h2.tag} id="fs-features-heading" className="fs-features__heading" {...fsAttrs(FS.h2)}>
            {copy.layout620.heading}
          </${h2.tag}>
          <p className="fs-features__description">{copy.layout620.description}</p>
        </div>
        <div className="fs-features__grid">
          {copy.layout620.items.map((item, i) => (
            <Fragment key={item.heading}>
              {i > 0 ? <div className="fs-features__divider" aria-hidden="true" /> : null}
              <div className="fs-features__item">
                <div className="fs-features__icon" aria-hidden="true" />
                <${item1.tag} className="fs-features__item-heading" {...fsAttrs(ITEM_HEADINGS[i] ?? FS.item1)}>
                  {item.heading}
                </${item1.tag}>
                <p className="fs-features__item-body">{item.description}</p>
              </div>
            </Fragment>
          ))}
        </div>
        <div className="fs-features__actions">
          {copy.layout620.buttons.map((b) =>
            b.variant === "link" ? (
              <${link.tag} key={b.variant} href="#" className="fs-features__link" {...fsAttrs(FS.link)}>
                <span>{b.label}</span>
                <span aria-hidden="true">›</span>
              </${link.tag}>
            ) : (
              <Button key={b.variant} variant={b.variant} fs={FS.ctaSecondary}>
                {b.label}
              </Button>
            ),
          )}
        </div>
      </div>
    </${root.tag}>
  );
}
`,
  );
}
