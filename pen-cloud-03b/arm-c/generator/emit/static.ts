import type { Ctx } from "../lib/ctx.ts";
import { emit, emitCss, OUT } from "../lib/emitutil.ts";
import { emitTokensCss, emitTokensTs } from "../lib/tokens.ts";

export function emitTokens(ctx: Ctx): void {
  emit(ctx, `${OUT}/tokens.css`, emitTokensCss(ctx.tokens, ctx.dsc.breakpoints, ctx.header.css));
  emit(ctx, `${OUT}/tokens.ts`, emitTokensTs(ctx.tokens, ctx.dsc.breakpoints, ctx.dsc.revision, ctx.header.ts));
}

export function emitCopy(ctx: Ctx): void {
  emit(ctx, `${OUT}/copy.ts`, `${ctx.header.ts}export const copy = ${JSON.stringify(ctx.copy, null, 2)} as const;\n`);
}

export function emitRuntime(ctx: Ctx): void {
  const F = "runtime.ts";
  const grey = "#d9d9d9";
  ctx.lit(F, "fill", grey, "image placeholder colour (ARM-CONTRACT; not a DSC token)", "ARM-CONTRACT.md");
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='12' viewBox='0 0 10 12' preserveAspectRatio='none'>" +
    `<rect width='10' height='12' fill='${grey}'/></svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
  emit(
    ctx,
    `${OUT}/runtime.ts`,
    `${ctx.header.ts}import { useSyncExternalStore } from "react";

/** Identity attributes carried by every generated component/section root. */
export interface FsMeta {
  readonly id: string;
  readonly component?: string;
  readonly penpot?: string;
  readonly bbc?: string;
  readonly idTablet?: string;
  readonly idMobile?: string;
  readonly penpotTablet?: string;
  readonly penpotMobile?: string;
}

export interface FsAttrs {
  "data-fs-id": string;
  "data-fs-component"?: string;
  "data-fs-penpot"?: string;
  "data-fs-bbc"?: string;
  "data-fs-id-tablet"?: string;
  "data-fs-id-mobile"?: string;
  "data-fs-penpot-tablet"?: string;
  "data-fs-penpot-mobile"?: string;
}

export function fsAttrs(m: FsMeta): FsAttrs {
  const a: FsAttrs = { "data-fs-id": m.id };
  if (m.component) a["data-fs-component"] = m.component;
  if (m.penpot) a["data-fs-penpot"] = m.penpot;
  if (m.bbc) a["data-fs-bbc"] = m.bbc;
  if (m.idTablet) a["data-fs-id-tablet"] = m.idTablet;
  if (m.idMobile) a["data-fs-id-mobile"] = m.idMobile;
  if (m.penpotTablet) a["data-fs-penpot-tablet"] = m.penpotTablet;
  if (m.penpotMobile) a["data-fs-penpot-mobile"] = m.penpotMobile;
  return a;
}

/** SSR-safe media query hook: false on the server and during hydration, live afterwards. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Image placeholder (${grey} rectangle) as an inline SVG data URI: no network request. */
export const PLACEHOLDER_IMAGE =
  ${JSON.stringify(uri)};
`,
  );
}

export function emitBase(ctx: Ctx): void {
  const F = "base.css";
  const css = ctx.newCss();
  const t = (id: string) => ctx.tokens.ref(F, id);
  css.rule("base", "*,\n*::before,\n*::after", { "box-sizing": "border-box" });
  css.rule("base", "html", { "-webkit-text-size-adjust": "100%" });
  css.rule("base", "body", {
    margin: "0",
    background: t("color.scheme.background"),
    color: t("color.scheme.text"),
    "font-family": t(ctx.dsc.typography?.family ?? "font.family.sans"),
    "font-size": t("font.size.regular"),
    "font-weight": t("font.weight.regular"),
    "line-height": t("font.lineHeight.body"),
  });
  css.rule("base", "h1,\nh2,\nh3,\nh4,\nh5,\nh6,\np,\nfigure,\nblockquote,\nul", { margin: "0" });
  css.rule("base", "ul", { padding: "0", "list-style": "none" });
  css.rule("base", "img", { display: "block" });
  css.rule("base", "button", { "font-family": "inherit" });
  const outline = ctx.lit(
    F,
    "outline-width",
    "2px",
    "focus ring geometry (accessibility requirement, not DSC-governed)",
    "task:visible-focus",
  );
  css.rule("base", ":focus-visible", {
    outline: `${outline} solid ${t("color.scheme.border")}`,
    "outline-offset": ctx.lit(F, "outline-offset", "2px", "focus ring geometry", "task:visible-focus"),
  });
  css.rule("base", ".fs-sr-only", {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    "white-space": "nowrap",
    border: "0",
  });
  emitCss(ctx, `${OUT}/base.css`, css);
}
