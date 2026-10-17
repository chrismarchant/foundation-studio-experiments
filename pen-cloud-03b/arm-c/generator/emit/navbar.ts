import type { Ctx } from "../lib/ctx.ts";
import { emit, emitCss, fsConst, HEADING, OUT, typo } from "../lib/emitutil.ts";
import { parseTw } from "../lib/twparse.ts";

export function emitNavbar(ctx: Ctx): void {
  const F = "Navbar.css";
  const id = "fs.section.navbar";
  const dsc = ctx.comp(id);
  const inter = dsc.interaction as Record<string, any> | undefined;
  if (!inter || inter.library !== "motion/react") throw new Error("Navbar interaction spec missing");
  const SEC = "Navbar17";
  const o = ctx.obs;
  const srcOf = (sel: string) => `penpot-structure:${SEC}>${sel}`;

  const root = ctx.sac.meta("fs.section.navbar.desktop", id);
  const cta = ctx.sac.meta("fs.section.navbar.desktop.cta-primary");
  if (root.tag !== "nav") throw new Error("Expected SAC navigation role to map to <nav>");
  if (root.penpot !== dsc.external.penpot?.desktop) throw new Error("Navbar Penpot desktop id differs between DSC and SAC");

  const css = ctx.newCss();
  const t = (x: string) => ctx.tokens.ref(F, x);
  const dark = t("color.neutral.darkest");
  const border = t("color.scheme.border");

  css.rule("base", ".fs-navbar", {
    position: "relative",
    background: ctx.bound(F, id, "background"),
    color: t("color.scheme.text"),
  });
  css.rule("base", ".fs-navbar__bar", {
    display: "flex",
    "align-items": "center",
    "justify-content": "space-between",
    "padding-inline": "var(--fs-layout-side-padding)",
  });
  css.resp(".fs-navbar__bar", "height", o.perBp((bp) => o.rootHeight(bp, SEC)), (v) =>
    ctx.lit(F, "height", `${v}px`, "navbar bar height (observation; panel offsets in the DSC use the same 4rem/4.5rem)", srcOf("root.h")),
  );
  const logoW = o.width("lg", SEC, "Logo");
  const logoH = o.height("lg", SEC, "Logo");
  css.rule("base", ".fs-navbar__logo", {
    display: "block",
    width: ctx.lit(F, "width", `${logoW}px`, "logo placeholder size (ARM-CONTRACT 84x36)", srcOf("Logo")),
    height: ctx.lit(F, "height", `${logoH}px`, "logo placeholder size (ARM-CONTRACT 84x36)", srcOf("Logo")),
    background: dark,
  });
  css.rule("base", ".fs-navbar__right", { display: "flex", "align-items": "center" });
  css.resp(".fs-navbar__right", "gap", o.perBp((bp) => o.gap(bp, SEC, "NavRight")), (v) =>
    ctx.sp(F, "gap", v, srcOf("NavRight.gap")),
  );

  const hbW = o.width("lg", SEC, "Hamburger");
  const hbH = o.height("lg", SEC, "Hamburger");
  const lineW = o.width("lg", SEC, "Line1");
  const lineH = o.height("lg", SEC, "Line1");
  const lineGap = o.gap("lg", SEC, "Hamburger");
  const hb = (prop: string, v: number, what: string) =>
    ctx.lit(F, prop, `${v}px`, `hamburger ${what} (observation; ARM-CONTRACT 24x2 lines)`, srcOf("Hamburger"));
  css.rule("base", ".fs-navbar__toggle", {
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    width: hb("width", hbW, "hit area"),
    height: hb("height", hbH, "hit area"),
    padding: "0",
    border: "0",
    background: "transparent",
    cursor: "pointer",
  });
  css.rule("base", ".fs-navbar__lines", {
    display: "flex",
    "flex-direction": "column",
    "align-items": "center",
    gap: hb("gap", lineGap, "line gap"),
    width: hb("width", lineW, "line length"),
  });
  css.rule("base", ".fs-navbar__line", {
    display: "block",
    width: "100%",
    height: hb("height", lineH, "line thickness"),
    background: dark,
  });
  css.rule("base", ".fs-navbar__line-middle", { position: "relative", width: "100%", height: hb("height", lineH, "line thickness") });
  css.rule("base", ".fs-navbar__line-middle .fs-navbar__line", { position: "absolute", top: "0", left: "0" });

  const panelUtils = String(inter.menu.panel)
    .split(/\s+/)
    .filter((x) => x.includes("["))
    .join(" ");
  const panel = parseTw(panelUtils);
  const pl = (prop: string, v: string) =>
    ctx.lit(F, prop, v, "menu panel height (DSC interaction.menu.panel)", "dsc:fs.section.navbar.interaction.menu.panel");
  css.rule("base", ".fs-navbar__panel", {
    position: "absolute",
    left: "0",
    right: "0",
    top: "100%",
    "z-index": "20",
    height: pl("height", panel.base.height as string),
    overflow: "auto",
    display: "flex",
    "flex-direction": "column",
    "justify-content": "space-between",
    "padding-inline": "var(--fs-layout-side-padding)",
    background: ctx.bound(F, id, "background"),
  });
  if (panel.md.height) css.rule("md", ".fs-navbar__panel", { height: pl("height", panel.md.height) });
  if (!/text-h3/.test(String(inter.menu.links)) || !/bold/.test(String(inter.menu.links))) {
    throw new Error("Unexpected DSC menu link spec");
  }
  css.rule("base", ".fs-navbar__menu-link", {
    display: "block",
    padding: `${ctx.sp(F, "padding-block", 16, "dsc:menu.links (assumed row padding)")} 0`,
    "border-top": `${ctx.lit(F, "border-width", "1px", "divider thickness", "dsc:menu.links border-t")} solid ${border}`,
    color: t("color.scheme.text"),
    "text-align": "right",
    "text-decoration": "none",
    ...typo(ctx, F, HEADING({ size: "font.size.h3" })),
  });
  css.rule("base", ".fs-navbar__panel-bottom", {
    display: "flex",
    "align-items": "center",
    "justify-content": "space-between",
    padding: `${ctx.sp(F, "padding-block", 32, "dsc:menu.bottom (assumed)")} 0`,
    "border-top": `${ctx.lit(F, "border-width", "1px", "divider thickness", "dsc:menu.links border-t")} solid ${border}`,
  });
  css.rule("base", ".fs-navbar__contact", {
    color: t("color.scheme.text"),
    "font-size": t("font.size.regular"),
    "line-height": t("font.lineHeight.body"),
    "font-weight": t("font.weight.semibold"),
  });
  css.rule("base", ".fs-navbar__social", { display: "flex", gap: ctx.sp(F, "gap", 16, "dsc:menu.bottom (assumed)") });
  const icon = ctx.lit(F, "width", "24px", "social icon placeholder size (assumption: DSC gives no size)", "assumption:A3");
  css.rule("base", ".fs-navbar__social-icon", { display: "block", width: icon, height: icon, background: dark });
  emitCss(ctx, `${OUT}/Navbar.css`, css);

  const hb2 = inter.hamburger;
  const tr = (o2: Record<string, unknown>) => {
    const { duration, delay, ease } = o2 as { duration?: number; delay?: number; ease?: string };
    const parts = [`duration: ${duration}`];
    if (delay !== undefined) parts.push(`delay: ${delay}`);
    if (ease) parts.push(`ease: ${JSON.stringify(ease)}`);
    return `{ ${parts.join(", ")} }`;
  };
  const top = hb2.topLine;
  const mid = hb2.middleLines;
  const rot = mid.open.rotate as number[];
  const linksN = ctx.copy.navbar.links.length;
  const socialN = Number(String(inter.menu.bottom).match(/(\d+) social icons/)?.[1] ?? 5);
  const variantsTop = `{
  open: { width: ${top.open.width}, transition: ${tr(top.open)} },
  close: { width: ${JSON.stringify(top.close.width)}, transition: ${tr(top.close)} },
}`;
  const variantsMid = (deg: number) => `{
  open: { rotate: ${deg}, transition: ${tr(mid.open)} },
  close: { rotate: ${mid.close.rotate}, transition: ${tr(mid.close)} },
}`;
  void linksN;

  emit(
    ctx,
    `${OUT}/Navbar.tsx`,
    `${ctx.header.ts}import { AnimatePresence, type Variants, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { copy } from "./copy";
import { type FsMeta, fsAttrs } from "./runtime";
import "./tokens.css";
import "./Navbar.css";

${fsConst({ root, ctaPrimary: cta })}

const MENU_ID = "fs-navbar-menu";
const SOCIAL_ICONS = ${JSON.stringify(Array.from({ length: socialN }, (_, i) => `social-${i + 1}`))} as const;

const TOP_LINE: Variants = ${variantsTop};
const MIDDLE_LINE_A: Variants = ${variantsMid(rot[0] as number)};
const MIDDLE_LINE_B: Variants = ${variantsMid(rot[1] as number)};
const BOTTOM_LINE: Variants = TOP_LINE; // DSC: "mirror of topLine"

export interface NavbarProps {
  subject?: string;
}

export function Navbar({ subject }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const state = open ? "open" : "close";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const rootMeta: FsMeta = FS.root;
  return (
    <header
      className="fs-navbar"
      data-fs-subject={subject}
      {...fsAttrs(rootMeta)}
    >
      <nav className="fs-navbar__bar" aria-label="Main">
        <a className="fs-navbar__logo" href="#" aria-label={copy.navbar.logoAlt} />
        <div className="fs-navbar__right">
          <Button variant="primary" fs={FS.ctaPrimary}>
            {copy.navbar.button}
          </Button>
          <button
            type="button"
            className="fs-navbar__toggle"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? "Close menu" : "Open menu"}
            data-fs-bbc="bbc.nav.open-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="fs-navbar__lines" aria-hidden="true">
              <motion.span className="fs-navbar__line" variants={TOP_LINE} initial={false} animate={state} />
              <span className="fs-navbar__line-middle">
                <motion.span className="fs-navbar__line" variants={MIDDLE_LINE_A} initial={false} animate={state} />
                <motion.span className="fs-navbar__line" variants={MIDDLE_LINE_B} initial={false} animate={state} />
              </span>
              <motion.span className="fs-navbar__line" variants={BOTTOM_LINE} initial={false} animate={state} />
            </span>
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={MENU_ID}
            className="fs-navbar__panel"
            initial={{ opacity: ${inter.menu.opacity.close} }}
            animate={{ opacity: ${inter.menu.opacity.open} }}
            exit={{ opacity: ${inter.menu.opacity.close} }}
            transition={{ duration: ${inter.menu.duration} }}
          >
            <ul>
              {copy.navbar.links.map((label) => (
                <li key={label}>
                  <a className="fs-navbar__menu-link" href="#">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="fs-navbar__panel-bottom">
              <a className="fs-navbar__contact" href="#">
                Contact
              </a>
              <ul className="fs-navbar__social" aria-label="Social">
                {SOCIAL_ICONS.map((name) => (
                  <li key={name}>
                    <a className="fs-navbar__social-icon" href="#" aria-label={name} />
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
`,
  );
}
