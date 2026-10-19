import type { Layer } from "../lib/css.ts";
import type { Ctx } from "../lib/ctx.ts";
import { BODY, emit, emitCss, fsConst, HEADING, OUT, typo } from "../lib/emitutil.ts";

/** DSC r3 `fs.section.testimonials` `layout.grid` (cumulative mobile-first rules keyed by screen; null = base). */
interface GridSpec {
  track: string;
  rules: { screen: Layer | null; columns?: number; rows?: number | "auto" }[];
  quoteCardSpan: { fromScreen: Layer; columns: number };
  orderBelowScreen: { screen: Layer; cardIndex: number; order: "last" };
}

/** r1/r2 DSCs carry no layout.grid: the grid they described implicitly (1 / 2 / 4 columns, span from md, index 2). */
const LEGACY_GRID: GridSpec = {
  track: "minmax(0, 1fr)",
  rules: [
    { screen: null, columns: 1, rows: "auto" },
    { screen: "md", columns: 2 },
    { screen: "lg", columns: 4 },
  ],
  quoteCardSpan: { fromScreen: "md", columns: 2 },
  orderBelowScreen: { screen: "lg", cardIndex: 2, order: "last" },
};

export function emitTestimonials(ctx: Ctx): void {
  const F = "Testimonials.css";
  const id = "fs.section.testimonials";
  const dsc = ctx.comp(id);
  const SEC = "Testimonial37";
  const o = ctx.obs;
  const src = (s: string) => `penpot-structure:${SEC}>${s}`;

  const root = ctx.sac.meta("fs.section.testimonials.desktop", id);
  const h2 = ctx.sac.meta("fs.section.testimonials.desktop.h2");
  if (root.tag !== "section") throw new Error("Expected testimonials -> <section>");
  if (root.penpot !== dsc.external.penpot?.desktop)
    throw new Error("Testimonials Penpot desktop id differs between DSC and SAC");
  const grid = (dsc.layout?.grid as GridSpec | undefined) ?? LEGACY_GRID;
  const lastIdx = grid.orderBelowScreen.cardIndex;
  const lastScreen = grid.orderBelowScreen.screen;
  if (grid.orderBelowScreen.order !== "last") throw new Error("Unsupported testimonials orderBelowScreen.order");
  const cards = ctx.copy.testimonial37.cards;
  if (cards[lastIdx]?.kind !== "quote") throw new Error(`Card index ${lastIdx} is expected to be a quote card`);

  // design observation vs intent: grid gap at sm
  const obsGapSm = o.gap("sm", SEC, "Grid");
  const tokGap = ctx.tokens.valueAt(dsc.bindings.find((b) => b.property === "gridGap")?.token ?? "", "sm");
  if (`${obsGapSm}px` !== tokGap) {
    ctx.conflicts.push({
      id: "testimonials.grid-gap.sm",
      intent: `DSC binds gridGap to fs.token.space.gap.8 = ${tokGap} at every breakpoint`,
      observed: `Penpot mobile Grid gap is ${obsGapSm}px`,
      resolution: "DSC wins: 32px at sm as well",
    });
  }
  const obsOrder = ["logo", "logo", "quote", "quote", "logo", "logo"];
  ctx.conflicts.push({
    id: "testimonials.order.below-lg",
    intent: `Owner task statement: card index ${lastIdx} (first quote card) is ordered last below ${lastScreen}`,
    observed: `Penpot tablet/mobile boards keep DOM order (${obsOrder.join(", ")}) with both quote cards adjacent`,
    resolution: `Task statement followed (CSS order: 1 on card index ${lastIdx} below ${lastScreen})`,
  });

  const css = ctx.newCss();
  const t = (x: string) => ctx.tokens.ref(F, x);
  const text = t("color.scheme.text");
  const dark = t("color.neutral.darkest");
  const bw = ctx.lit(
    F,
    "border-width",
    "1px",
    "card border thickness (observation: 1px inner stroke)",
    src("LogoCard.stroke"),
  );
  const px = (prop: string, why: string, s: string) => (v: number) => ctx.lit(F, prop, `${v}px`, why, src(s));
  const sp = (prop: string, s: string) => (v: number) => ctx.sp(F, prop, v, src(s));

  css.rule("base", ".fs-testimonials", {
    background: ctx.bound(F, id, "background"),
    color: text,
    "padding-top": ctx.bound(F, id, "paddingTop"),
    "padding-bottom": ctx.bound(F, id, "paddingBottom"),
    "padding-inline": "var(--fs-layout-side-padding)",
  });
  css.rule("base", ".fs-testimonials__container", {
    "max-width": "var(--fs-layout-container-max)",
    "margin-inline": "auto",
    display: "flex",
    "flex-direction": "column",
    "align-items": "center",
  });
  css.resp(
    ".fs-testimonials__container",
    "gap",
    o.perBp((bp) => o.gap(bp, SEC, "Container")),
    px("gap", "container row gap (observation; no DSC token)", "Container.gap"),
  );
  css.rule("base", ".fs-testimonials__header", {
    // DSC-R4-01: bound text column; r1-r3 DSCs keep the observation
    "max-width": ctx.hasBinding(id, "textColumnMaxWidth")
      ? ctx.bound(F, id, "textColumnMaxWidth")
      : ctx.lit(
          F,
          "max-width",
          `${o.width("lg", SEC, "Header")}px`,
          "section header column width (observation)",
          src("Header.w"),
        ),
    "text-align": "center",
  });
  css.rule("base", ".fs-testimonials__heading", typo(ctx, F, HEADING(), ctx.bound(F, id, "headingFontSize")));
  css.resp(
    ".fs-testimonials__description",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Header > Space")),
    sp("margin-top", "Header>Space.h"),
  );
  css.rule("base", ".fs-testimonials__description", typo(ctx, F, BODY("font.size.medium")));

  // Grid tracks (DSC-R3-04): cumulative mobile-first rules keyed by screen; rows "auto" = no row template.
  let rowTemplate = false;
  const gridDecls = (r: GridSpec["rules"][number]): Record<string, string> => {
    const d: Record<string, string> = {};
    // C-R3-05: r3 base "columns: 1" is the implicit single column (no explicit template, so the sm quote-card
    // span can create the second implicit column); r1/r2 (no layout.grid) keep their explicit one-track template.
    if (r.columns !== undefined && !(r.screen === null && r.columns === 1 && dsc.layout?.grid)) {
      d["grid-template-columns"] = r.columns === 1 ? grid.track : `repeat(${r.columns}, ${grid.track})`;
    }
    if (typeof r.rows === "number") {
      d["grid-template-rows"] = `repeat(${r.rows}, ${grid.track})`;
      rowTemplate = true;
    } else if (r.rows === "auto" && rowTemplate) {
      throw new Error("Testimonials grid: rows 'auto' after a row template is not supported");
    }
    return d;
  };
  const gridRules = [...grid.rules].sort((a, b) => (a.screen === null ? -1 : b.screen === null ? 1 : 0));
  const baseGrid = gridRules.find((r) => r.screen === null);
  if (!baseGrid) throw new Error("Testimonials grid: base rule (screen null) missing");
  css.rule("base", ".fs-testimonials__grid", {
    width: "100%",
    display: "grid",
    ...gridDecls(baseGrid),
    gap: ctx.bound(F, id, "gridGap"),
    margin: "0",
    padding: "0",
    "list-style": "none",
  });
  for (const r of gridRules) if (r.screen !== null) css.rule(r.screen, ".fs-testimonials__grid", gridDecls(r));

  css.rule("base", ".fs-testimonials__card", {
    background: ctx.bound(F, id, "cardFill"),
    border: `${bw} solid ${ctx.bound(F, id, "cardBorder")}`,
    "border-radius": ctx.bound(F, id, "cardRadius"),
    "min-width": "0",
  });
  const padOf = (sel: string) => (bp: "lg" | "md" | "sm") => [o.pad(bp, SEC, sel, 0), o.pad(bp, SEC, sel, 1)] as const;
  const padPair = (s: string) => (v: readonly [number, number]) =>
    `${sp("padding", s)(v[0])} ${sp("padding", s)(v[1])}`;
  css.rule("base", ".fs-testimonials__card--logo", {
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
  });
  css.resp(".fs-testimonials__card--logo", "padding", o.perBp(padOf("LogoCard")), padPair("LogoCard.pad"));
  css.resp(".fs-testimonials__card--quote", "padding", o.perBp(padOf("QuoteCard")), padPair("QuoteCard.pad"));
  css.rule(grid.quoteCardSpan.fromScreen, ".fs-testimonials__card--quote", {
    "grid-column": `span ${grid.quoteCardSpan.columns}`,
  });
  css.rule("base", `.fs-testimonials__card--last-below-${lastScreen}`, { order: "1" });
  css.rule(lastScreen, `.fs-testimonials__card--last-below-${lastScreen}`, { order: "0" });

  const sq = (n: string, sel: string) => ({
    w: ctx.lit(F, "width", `${o.width("lg", SEC, sel)}px`, `${n} placeholder (ARM-CONTRACT)`, src(sel)),
    h: ctx.lit(F, "height", `${o.height("lg", SEC, sel)}px`, `${n} placeholder (ARM-CONTRACT)`, src(sel)),
  });
  const logo = sq("logo", "Logo");
  css.rule("base", ".fs-testimonials__logo", { display: "block", width: logo.w, height: logo.h, background: dark });
  const star = sq("star", "Star");
  css.rule("base", ".fs-testimonials__stars", {
    display: "flex",
    gap: ctx.lit(F, "gap", `${o.gap("lg", SEC, "Stars")}px`, "star gap (observation)", src("Stars.gap")),
  });
  css.rule("base", ".fs-testimonials__star", { display: "block", width: star.w, height: star.h, background: dark });
  css.resp(
    ".fs-testimonials__quote",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "QuoteCard > Space", 0)),
    sp("margin-top", "QuoteCard>Space[0].h"),
  );
  css.rule("base", ".fs-testimonials__quote", typo(ctx, F, BODY("font.size.medium")));
  css.resp(
    ".fs-testimonials__author",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "QuoteCard > Space", 1)),
    sp("margin-top", "QuoteCard>Space[1].h"),
  );
  css.rule("base", ".fs-testimonials__author", {
    display: "flex",
    "align-items": "center",
    gap: ctx.sp(F, "gap", o.gap("lg", SEC, "Author"), src("Author.gap")),
  });
  const av = sq("avatar", "Avatar");
  css.rule("base", ".fs-testimonials__avatar", {
    width: av.w,
    height: av.h,
    "flex-shrink": "0",
    "border-radius": t("radius.image"),
  });
  css.rule("base", ".fs-testimonials__name", typo(ctx, F, BODY("font.size.regular", "font.weight.semibold")));
  css.rule("base", ".fs-testimonials__role", typo(ctx, F, BODY("font.size.regular")));
  emitCss(ctx, `${OUT}/Testimonials.css`, css);

  emit(
    ctx,
    `${OUT}/Testimonials.tsx`,
    `${ctx.header.ts}import { copy } from "./copy";
import { type FsMeta, PLACEHOLDER_IMAGE, fsAttrs } from "./runtime";
import "./tokens.css";
import "./Testimonials.css";

${fsConst({ root, h2 })}

const LAST_BELOW_${lastScreen.toUpperCase()}_INDEX = ${lastIdx};
const STAR_KEYS = ["star-1", "star-2", "star-3", "star-4", "star-5"] as const;

export interface TestimonialsProps {
  subject?: string;
}

export function Testimonials({ subject }: TestimonialsProps) {
  return (
    <${root.tag}
      className="fs-testimonials"
      aria-labelledby="fs-testimonials-heading"
      data-fs-subject={subject}
      {...fsAttrs(FS.root)}
    >
      <div className="fs-testimonials__container">
        <div className="fs-testimonials__header">
          <${h2.tag} id="fs-testimonials-heading" className="fs-testimonials__heading" {...fsAttrs(FS.h2)}>
            {copy.testimonial37.heading}
          </${h2.tag}>
          <p className="fs-testimonials__description">{copy.testimonial37.description}</p>
        </div>
        <ul className="fs-testimonials__grid">
          {copy.testimonial37.cards.map((card, i) => {
            const order = i === LAST_BELOW_${lastScreen.toUpperCase()}_INDEX ? " fs-testimonials__card--last-below-${lastScreen}" : "";
            if (card.kind === "logo") {
              return (
                <li key={"logo-" + i} className={"fs-testimonials__card fs-testimonials__card--logo" + order}>
                  <span className="fs-testimonials__logo" aria-hidden="true" />
                </li>
              );
            }
            return (
              <li key={"quote-" + i} className={"fs-testimonials__card fs-testimonials__card--quote" + order}>
                <figure>
                  <div className="fs-testimonials__stars" role="img" aria-label={card.stars + " out of 5 stars"}>
                    {STAR_KEYS.slice(0, card.stars).map((k) => (
                      <span key={k} className="fs-testimonials__star" />
                    ))}
                  </div>
                  <blockquote className="fs-testimonials__quote">
                    <p>{card.quote}</p>
                  </blockquote>
                  <figcaption className="fs-testimonials__author">
                    <img className="fs-testimonials__avatar" src={PLACEHOLDER_IMAGE} alt="" />
                    <div>
                      <p className="fs-testimonials__name">{card.name}</p>
                      <p className="fs-testimonials__role">
                        {card.position}, {card.company}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </${root.tag}>
  );
}
`,
  );
}
