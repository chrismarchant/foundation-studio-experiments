import type { Ctx } from "../lib/ctx.ts";
import type { Bp } from "../lib/types.ts";

const BPS: Bp[] = ["lg", "md", "sm"];

/** Design observation (Penpot structure) vs DSC intent: computed, recorded in the manifest. DSC wins. */
export function emitConflicts(ctx: Ctx): void {
  const o = ctx.obs;
  const textSizes: { id: string; section: string; selector: string; token: string }[] = [
    { id: "hero.h1", section: "Header80 / StickyStage", selector: "HeroText > H1", token: "font.size.h1" },
    { id: "features.h2", section: "Layout620", selector: "Header > H2", token: "font.size.h2" },
    { id: "features.item-heading", section: "Layout620", selector: "Item1 > H4", token: "font.size.h4" },
    { id: "testimonials.h2", section: "Testimonial37", selector: "Header > H2", token: "font.size.h2" },
    { id: "cta.h2", section: "Cta25", selector: "Container > H2", token: "font.size.h2" },
  ];
  for (const t of textSizes) {
    for (const bp of BPS) {
      const observed = o.q(bp, t.section, t.selector).text?.size;
      const intent = ctx.tokens.valueAt(t.token, bp);
      if (observed && `${observed}px` !== intent) {
        ctx.conflicts.push({
          id: `${t.id}.font-size.${bp}`,
          intent: `fs.token.${t.token} = ${intent} at ${bp}`,
          observed: `Penpot ${bp} board text is ${observed}px`,
          resolution: `DSC wins: ${intent}`,
        });
      }
    }
  }

  const sec = o.q("lg", "Header80 / StickyStage", "Button / Secondary");
  if (!sec.fill) {
    const fillTok = ctx.comp("fs.component.button.secondary").bindings.find((b) => b.property === "fill")?.token ?? "";
    ctx.conflicts.push({
      id: "button.secondary.fill",
      intent: `DSC binds Secondary fill to ${fillTok} (${ctx.tokens.get(fillTok).value})`,
      observed: "Penpot Secondary button instance carries no fill (stroke only)",
      resolution: "DSC wins: background is the bound token",
    });
  }

  const prim = o.q("lg", "Header80 / StickyStage", "Button / Primary");
  ctx.conflicts.push({
    id: "button.width.stroke",
    intent: "DSC geometry: paddingX 24, strokeWidth 1 (CSS border + padding)",
    observed: `Penpot Primary is ${prim.w}px wide with an inner stroke (24 + label + 24); a CSS border adds 2px`,
    resolution: "CSS border-box with 1px border and 24px padding kept (rendered width is label + 50px)",
  });

  const heroDsc = ctx.comp("fs.section.hero");
  const tb = heroDsc.layout?.textBlock as { paddingTopBinding: string; paddingBottomBinding: string } | undefined;
  const padTok = (binding: string) => heroDsc.bindings.find((b) => b.property === binding)?.token ?? "";
  const textBlockIntent = (bp: Bp): string => {
    const top = ctx.tokens.valueAt(padTok(tb?.paddingTopBinding ?? ""), bp);
    const bottom = ctx.tokens.valueAt(padTok(tb?.paddingBottomBinding ?? ""), bp);
    const shift = (Number.parseFloat(top) - Number.parseFloat(bottom)) / 2;
    return `Hero text block vertically centred in the 100vh sticky stage's padded content box (DSC layout.textBlock; padding-top ${top} = ${padTok(tb?.paddingTopBinding ?? "")}, padding-bottom ${bottom} = ${padTok(tb?.paddingBottomBinding ?? "")} at ${bp}; net shift of the block ${shift}px from the stage centre)`;
  };
  for (const bp of BPS) {
    const stage = o.section(bp, "Header80 / StickyStage");
    const text = o.q(bp, "Header80 / StickyStage", "HeroText");
    const observedTop = text.y - stage.y;
    const centredTop = (stage.h - text.h) / 2;
    if (Math.abs(observedTop - centredTop) > 1) {
      ctx.conflicts.push({
        id: `hero.text-offset.${bp}`,
        intent: tb
          ? textBlockIntent(bp)
          : "Hero text vertically centred in the 100vh sticky stage (DSC gives no offset)",
        observed: `Penpot ${bp}: text block top ${observedTop}px vs ${centredTop}px if centred (${(observedTop - centredTop).toFixed(1)}px lower)`,
        resolution: tb
          ? "DSC wins: centred in the padded stage with the bound paddings; the Penpot offset is not reproduced as a separate value"
          : "Centred; offset not reproduced (not derivable from the DSC)",
      });
    }
  }

  ctx.conflicts.push({
    id: "navbar.links.count",
    intent: "DSC navbar interaction.menu.links: 8 links",
    observed: `copy.json provides ${ctx.copy.navbar.links.length} links; Penpot boards show only the closed bar`,
    resolution: "copy.json wins for the link count (copy is identical across arms)",
  });
  const scr = ctx.dsc.screens;
  ctx.conflicts.push({
    id: "container.fluid",
    intent: "DSC breakpoints list container 1280 / 691 / 337 with 5% side padding",
    observed: "691 and 337 equal 90% of the 768 and 375 canvases (canvas minus 5% padding each side)",
    resolution: scr
      ? `Container is fluid: max-width follows screens[].container (${scr.map((s) => `${s.id} ${s.minWidth}px: ${s.container}`).join(", ")}) inside 5% side padding; md/sm values arise from the padding`
      : "Container is fluid: max-width 1280px (lg container) inside 5% side padding; md/sm values arise from the padding",
  });
  const gapSmObs = o.gap("sm", "Layout620", "Grid");
  ctx.conflicts.push({
    id: "features.grid-gap.sm",
    intent: "DSC binds features gridGap to fs.token.space.gap.8 (32px); 1 column with no dividers at sm",
    observed: `Penpot mobile Grid gap is ${gapSmObs}px; rows are ruled by 1px top/bottom lines`,
    resolution: "gridGap token applied between columns from md; at sm rows are stacked with 1px rules and no extra gap",
  });
}
