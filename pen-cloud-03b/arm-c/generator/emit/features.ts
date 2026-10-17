import type { Ctx } from "../lib/ctx.ts";
import { emit, emitCss, fsConst, HEADING, BODY, OUT, typo } from "../lib/emitutil.ts";
import type { PerBp } from "../lib/types.ts";

export function emitFeatures(ctx: Ctx): void {
  const F = "Features.css";
  const id = "fs.section.features";
  const dsc = ctx.comp(id);
  const SEC = "Layout620";
  const o = ctx.obs;
  const src = (s: string) => `penpot-structure:${SEC}>${s}`;

  const root = ctx.sac.meta("fs.section.features.desktop", id);
  const h2 = ctx.sac.meta("fs.section.features.desktop.h2");
  const items = [1, 2, 3].map((n) => ctx.sac.meta(`fs.section.features.desktop.item${n}.h3`));
  const sec = ctx.sac.meta("fs.section.features.desktop.cta-secondary");
  const link = ctx.sac.meta("fs.section.features.desktop.link");
  if (root.tag !== "section") throw new Error("Expected feature-section -> <section>");
  if (link.tag !== "a") throw new Error("Expected link -> <a>");
  if (root.penpot !== dsc.external.penpot?.desktop) throw new Error("Features Penpot desktop id differs between DSC and SAC");
  if (items.length !== ctx.copy.layout620.items.length) throw new Error("Feature item count differs from copy");

  const css = ctx.newCss();
  const t = (x: string) => ctx.tokens.ref(F, x);
  const text = t("color.scheme.text");
  const border = t("color.scheme.border");
  const px = (prop: string, why: string, s: string) => (v: number) => ctx.lit(F, prop, `${v}px`, why, src(s));
  const sp = (prop: string, s: string) => (v: number) => ctx.sp(F, prop, v, src(s));
  const bw = ctx.lit(F, "border-width", "1px", "divider thickness (ARM-CONTRACT 1px dividers)", "task:dividers");

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
  css.resp(".fs-features__container", "gap", o.perBp((bp) => o.gap(bp, SEC, "Container")), px("gap", "container row gap (observation; no DSC token)", "Container.gap"));
  const headerW = o.width("lg", SEC, "Header");
  css.rule("base", ".fs-features__header", {
    "max-width": ctx.lit(F, "max-width", `${headerW}px`, "section header column width (observation)", src("Header.w")),
  });
  css.rule("base", ".fs-features__tagline", {
    ...typo(ctx, F, BODY("font.size.regular", "font.weight.semibold")),
  });
  const tagSp: PerBp<number> = o.perBp((bp) => o.height(bp, SEC, "Header > Space", 0));
  css.resp(".fs-features__heading", "margin-top", tagSp, sp("margin-top", "Header>Space[0].h"));
  css.rule("base", ".fs-features__heading", {
    ...typo(ctx, F, HEADING(), ctx.bound(F, id, "headingFontSize")),
  });
  css.resp(".fs-features__description", "margin-top", o.perBp((bp) => o.height(bp, SEC, "Header > Space", 1)), sp("margin-top", "Header>Space[1].h"));
  css.rule("base", ".fs-features__description", {
    ...typo(ctx, F, BODY("font.size.medium"), ctx.bound(F, id, "descriptionFontSize" in {} ? "" : "")),
  });
  void 0;
  emitCss(ctx, `${OUT}/Features.css`, css);
  void border;
  void bw;
  void h2;
  void sec;
  void items;
  emit(ctx, `${OUT}/Features.tsx`, "");
  void fsConst;
}
