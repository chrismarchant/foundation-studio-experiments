import type { Layer } from "../lib/css.ts";
import type { Ctx } from "../lib/ctx.ts";
import { BODY, emit, emitCss, fsConst, HEADING, OUT, typo } from "../lib/emitutil.ts";
import { parseTw } from "../lib/twparse.ts";

export function emitHero(ctx: Ctx): void {
  const F = "Hero.css";
  const id = "fs.section.hero";
  const dsc = ctx.comp(id);
  const inter = dsc.interaction;
  if (inter?.library !== "motion/react") throw new Error("Hero interaction spec missing");
  const SEC = "Header80 / StickyStage";
  const o = ctx.obs;
  const srcI = `dsc:${id}.interaction`;
  const lit = (prop: string, v: string, why = "scroll-parallax geometry (DSC interaction block, not tokenised)") =>
    ctx.lit(F, prop, v, why, srcI);

  const root = ctx.sac.meta("fs.section.hero.desktop", id);
  const h1 = ctx.sac.meta("fs.section.hero.desktop.h1");
  const prim = ctx.sac.meta("fs.section.hero.desktop.cta-primary");
  const sec = ctx.sac.meta("fs.section.hero.desktop.cta-secondary");
  if (root.tag !== "header") throw new Error("Expected SAC hero role to map to <header>");
  if (h1.tag !== "h1") throw new Error("Expected hero heading h1");
  if (root.penpot !== dsc.external.penpot?.desktop)
    throw new Error("Hero Penpot desktop id differs between DSC and SAC");

  // mobile breakpoint: "useMediaQuery(max-width: 767px)"
  const mq = String(inter.breakpoint).match(/max-width:\s*(\d+)px/);
  if (!mq) throw new Error("Cannot parse hero interaction.breakpoint");
  const mobileMax = Number(mq[1]);
  const md = ctx.dsc.breakpoints.find((b) => b.id === "md");
  if (!md || md.minWidth !== mobileMax + 1) throw new Error("Hero mobile breakpoint does not match DSC md.minWidth");

  const css = ctx.newCss();
  const t = (x: string) => ctx.tokens.ref(F, x);
  const dark = t("color.scheme.text");

  css.rule("base", ".fs-hero", {
    position: "relative",
    height: lit("height", inter.sectionHeight.mobile),
    background: ctx.bound(F, id, "background"),
  });
  css.rule("md", ".fs-hero", { height: lit("height", inter.sectionHeight.desktop) });

  // "sticky top-0 h-screen overflow-hidden"
  if (inter.stage !== "sticky top-0 h-screen overflow-hidden") throw new Error("Unexpected hero stage spec");
  css.rule("base", ".fs-hero__stage", {
    position: "sticky",
    top: "0",
    height: lit("height", "100vh"),
    overflow: "hidden",
  });

  // text block (DSC-R3-03: layout.textBlock, absent in r1/r2)
  const textBlock = dsc.layout?.textBlock as
    | { verticalAlign: string; paddingTopBinding: string; paddingBottomBinding: string }
    | undefined;
  if (textBlock && textBlock.verticalAlign !== "center") throw new Error("Unexpected hero textBlock.verticalAlign");
  css.rule("base", ".fs-hero__text", {
    position: "absolute",
    inset: "0",
    "z-index": "1",
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    "padding-inline": "var(--fs-layout-side-padding)",
    // DSC-R3-03: the text block is centred inside the stage's padded content box (layout.textBlock)
    ...(textBlock
      ? {
          "padding-top": ctx.bound(F, id, textBlock.paddingTopBinding),
          "padding-bottom": ctx.bound(F, id, textBlock.paddingBottomBinding),
        }
      : {}),
    "pointer-events": "none",
  });
  const textW = o.width("lg", SEC, "HeroText");
  if (o.width("md", SEC, "HeroText") !== textW) throw new Error("HeroText width differs lg/md");
  css.rule("base", ".fs-hero__text-inner", {
    width: "100%",
    // DSC-R4-01: the text column is the bound token; r1-r3 DSCs (no textColumnMaxWidth binding) keep the observation
    "max-width": ctx.hasBinding(id, "textColumnMaxWidth")
      ? ctx.bound(F, id, "textColumnMaxWidth")
      : ctx.lit(
          F,
          "max-width",
          `${textW}px`,
          "hero text column width (observation)",
          `penpot-structure:${SEC}>HeroText.w`,
        ),
    "text-align": "center",
    "pointer-events": "auto",
  });
  css.rule("base", ".fs-hero__heading", {
    color: dark,
    ...typo(ctx, F, HEADING({ size: "font.size.h1" }), ctx.bound(F, id, "headingFontSize")),
  });
  css.resp(
    ".fs-hero__description",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Space24")),
    (v) => ctx.sp(F, "margin-top", v, `penpot-structure:${SEC}>Space24.h`),
  );
  css.rule("base", ".fs-hero__description", {
    color: dark,
    ...typo(ctx, F, BODY("font.size.medium"), ctx.bound(F, id, "descriptionFontSize")),
  });
  css.rule("base", ".fs-hero__actions", {
    display: "flex",
    "justify-content": "center",
    gap: ctx.bound(F, id, "buttonGap"),
  });
  css.resp(
    ".fs-hero__actions",
    "margin-top",
    o.perBp((bp) => o.height(bp, SEC, "Space32")),
    (v) => ctx.sp(F, "margin-top", v, `penpot-structure:${SEC}>Space32.h`),
  );

  // image columns
  const lay = inter.imageLayout;
  const colCommon = {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    display: "flex",
    "flex-direction": "column",
    gap: lit("gap", String(lay.gap)),
    "padding-top": lit("padding-top", String(lay.paddingTop)),
    "pointer-events": "none",
    "will-change": "transform",
  };
  css.rule("base", ".fs-hero__col", colCommon);
  css.rule("base", ".fs-hero__col--left", { "align-items": "flex-start" });
  css.rule("base", ".fs-hero__col--right", {
    "align-items": "flex-end",
    opacity: lit("opacity", String(lay.rightOpacity)),
  });
  css.rule("base", ".fs-hero__img", { position: "relative" });
  // DSC-R3-02: below the given screen every image box has min-height <value>; from that screen the aspect alone applies
  const mh = lay.minHeightBelowScreen as { screen: Layer; value: string } | undefined;
  if (mh) {
    css.rule("base", ".fs-hero__img", {
      "min-height": ctx.lit(
        F,
        "min-height",
        mh.value,
        `hero image box minimum height below screen ${mh.screen}`,
        `${srcI}.imageLayout.minHeightBelowScreen`,
      ),
    });
    css.rule(mh.screen, ".fs-hero__img", { "min-height": "0" });
  }
  const aspect = String(lay.aspect).match(/^pt-\[(.+)\]$/);
  if (!aspect) throw new Error("Cannot parse hero image aspect");
  css.rule("base", ".fs-hero__img::before", {
    content: '""',
    display: "block",
    "padding-top": lit("padding-top", aspect[1] as string, "image aspect ratio (DSC interaction.imageLayout.aspect)"),
  });
  css.rule("base", ".fs-hero__ph", {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    "border-radius": t("radius.image"),
  });

  const leftCls: string[] = [];
  const rightCls: string[] = [];
  const addCol = (side: "l" | "r", items: string[], out: string[]) => {
    items.forEach((utils, i) => {
      const cls = `fs-hero__img--${side}${i + 1}`;
      out.push(cls);
      const d = parseTw(utils);
      for (const layer of ["base", "md", "lg"] as const) {
        const decls: Record<string, string> = {};
        for (const [k, v] of Object.entries(d[layer])) decls[k] = lit(k, v);
        if (Object.keys(decls).length) css.rule(layer, `.${cls}`, decls);
      }
    });
  };
  addCol("l", lay.leftColumn as string[], leftCls);
  addCol("r", lay.rightColumn as string[], rightCls);
  if (leftCls.length + rightCls.length !== ctx.copy.header80.images) {
    throw new Error("DSC image layout count differs from copy.header80.images");
  }

  css.raw(`@media (prefers-reduced-motion: reduce) {
  [data-fs-motion] {
    transform: none !important;
  }
}`);
  emitCss(ctx, `${OUT}/Hero.css`, css);

  const tf = inter.transforms;
  const arr = (a: string[]) => JSON.stringify(a);
  emit(
    ctx,
    `${OUT}/Hero.tsx`,
    `${ctx.header.ts}import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { Button } from "./Button";
import { copy } from "./copy";
import { type FsMeta, PLACEHOLDER_IMAGE, fsAttrs, useMediaQuery } from "./runtime";
import "./tokens.css";
import "./Hero.css";

${fsConst({ root, h1, ctaPrimary: prim, ctaSecondary: sec })}

const MOBILE_QUERY = "(max-width: ${mobileMax}px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const LEFT_IMAGES = ${JSON.stringify(leftCls)} as const;
const RIGHT_IMAGES = ${JSON.stringify(rightCls)} as const;

export interface HeroProps {
  subject?: string;
}

export function Hero({ subject }: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  // Scroll target is the section; offset ["start start", "end end"].
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ${arr(inter.scroll.offset)},
  });
  const progress = useSpring(scrollYProgress, { bounce: ${inter.spring.bounce} });
  const yLeft = useTransform(
    progress,
    [0, 1],
    isMobile ? ${arr(tf.imagesLeft.mobile)} : ${arr(tf.imagesLeft.desktop)},
  );
  const yRight = useTransform(
    progress,
    [0, 1],
    isMobile ? ${arr(tf.imagesRight.mobile)} : ${arr(tf.imagesRight.desktop)},
  );

  return (
    <header
      ref={ref}
      className="fs-hero"
      data-fs-subject={subject}
      {...fsAttrs(FS.root)}
    >
      <div className="fs-hero__stage">
        <motion.div
          className="fs-hero__col fs-hero__col--left"
          data-fs-motion="images-left"
          style={reduceMotion ? undefined : { y: yLeft }}
          aria-hidden="true"
        >
          {LEFT_IMAGES.map((cls) => (
            <div key={cls} className={"fs-hero__img " + cls}>
              <img className="fs-hero__ph" src={PLACEHOLDER_IMAGE} alt="" />
            </div>
          ))}
        </motion.div>
        <motion.div
          className="fs-hero__col fs-hero__col--right"
          data-fs-motion="images-right"
          style={reduceMotion ? undefined : { y: yRight }}
          aria-hidden="true"
        >
          {RIGHT_IMAGES.map((cls) => (
            <div key={cls} className={"fs-hero__img " + cls}>
              <img className="fs-hero__ph" src={PLACEHOLDER_IMAGE} alt="" />
            </div>
          ))}
        </motion.div>
        <div className="fs-hero__text">
          <div className="fs-hero__text-inner">
            <${h1.tag} className="fs-hero__heading" {...fsAttrs(FS.h1)}>
              {copy.header80.heading}
            </${h1.tag}>
            <p className="fs-hero__description">{copy.header80.description}</p>
            <div className="fs-hero__actions">
              {copy.header80.buttons.map((b) => (
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
      </div>
    </header>
  );
}
`,
  );
}
