# ARM-C-R4-NOTES: Arm C revision r4 (C-R4)

Input change: `../inputs/dsc/fs.ds.relume-default.r4.json` (revision `sha256:6defaaa003c0d979526811cf6fa0a40f35b1f3ee9a726c0d77c27eb06ecc8918`, supersedes r3; DSC-R4-NOTES.md quotes the pending revision 066de3..., the file itself carries the revision above, with `penpot-reconciliation.capturedAt` filled in) and the corrected observations `../inputs/penpot/structure.r4.json`. A sorted-key diff of r3 against r4 shows exactly DSC-R4-01..05 plus metadata. Isolation rule observed (arm-c/**, inputs/** read-only, ARM-CONTRACT.md); the harness was used only as a Playwright browser library by a throwaway script (deleted together with `.tmp/`).

## Implementation changes

- C-R4-00 (observation input). `generate.ts`: `--structure <path rel. ../inputs>` / `FS_STRUCTURE`, mirroring `--dsc` (one shared `selectedInput()`); default `penpot/structure.json`, so r1-r3 reproduce. The manifest `inputs` map already hashes `INPUT_FILES.structure`, so it records `../inputs/penpot/structure.r4.json` with its sha256.
- C-R4-01 (DSC-R4-01 text column). Hero `.fs-hero__text-inner`, features `.fs-features__header`, testimonials `.fs-testimonials__header` and CTA `.fs-cta__content` take `max-width` from `ctx.bound(F, id, "textColumnMaxWidth")` = `var(--fs-size-text-column-max)`. New `ctx.hasBinding()`; with no such binding (r1-r3) the observation literal is emitted as before. The hero lg/md width-equality check moved into that fallback (the r4 observations differ per tier: 768 / 691.2 / 337). See assumption A1 (`width: 100%` on the testimonials header).
- C-R4-02 (DSC-R4-02 buttons). `emit/button.ts`: when `geometry.sizing === "padding"`, `padding: 12px 24px` (literals via `ctx.lit`, properties `padding-block` / `padding-inline`) and no `height`; the 1px border and the body line-height token stay. The generator checks primary = secondary geometry, `2 x paddingY + labelLineHeight + 2 x strokeWidth = height` and `labelLineHeight = body line-height x label font size` (1.5 x 16 = 24). `lib/types.ts`: typed `DscButtonGeometry`, optional `sizingRule`. r3 geometry keeps `height` + `padding: 0 24px`.
- C-R4-03 (DSC-R4-03 quote card). `emit/testimonials.ts`, when `layout.quoteCard` exists: `margin-bottom` on `.fs-testimonials__stars` and `.fs-testimonials__quote` from `starsGapBelow` / `quoteGapBelow` (sm tier -> base layer, md tier -> md layer, lg = md) through token refs; the observation-derived `margin-top` on quote and author is not emitted. Author block per tier: sm column / `flex-start` / `gap: 0`, md row / center / gap "observation" = Penpot `Author.gap` (lg) as before (`var(--fs-space-gap-4)`). Without `layout.quoteCard` (r1-r3) the old observation margins are emitted.
- C-R4-04 (DSC-R4-04 hero columns). `emit/hero.ts`: `columnInset: "layout.sidePadding"` -> `.fs-hero__col` gets `left` and `right` = `var(--fs-layout-side-padding)` instead of `left: 0; width: 100%` (left images start at the inset, the right column's images end at it). `aspectBase: "column"` -> no `.fs-hero__img::before`; `.fs-hero__col--left|--right .fs-hero__img { height }` per layer = 1.2 x widest `w-[..vw]` of that column (cumulative base / md / lg, parsed from the DSC strings), literals registered via `ctx.lit` with source `dsc:fs.section.hero.interaction.imageLayout.aspectBase`. `min-height: 35vw` below sm kept (rendered = max). vw offsets, gap, paddingTop, opacity, transforms untouched; Hero.tsx identical.
- C-R4-05 (DSC-R4-05 grid gap). No code needed for the CSS: `ctx.bound(F, id, "gridGap")` now resolves to `var(--fs-space-grid-gap)`; tokens.css carries the 24px sm override. `testimonials.grid-gap.sm` entry: text generalised (token id and values come from the binding) and, as before, only recorded when observation and token sm value differ; r4 observation 24px = token sm 24px, so it no longer appears (see "Remaining entries").
- Scripts: `generate:r4`, `generate:verify:r4` (`--dsc dsc/fs.ds.relume-default.r4.json --structure penpot/structure.r4.json`); `build` runs `generate:r4`; r1/r2/r3 scripts unchanged.

## Files changed (sha256, first 12 hex; r3 -> r4)

| file | r3 | r4 |
|---|---|---|
| generated/Button.css | 16f9df324dd1 | 500c16daf8c7 |
| generated/Cta.css | a9acb0e81bfc | 7e1b0a764745 |
| generated/Features.css | 7d3ec72e4ea2 | 2a7134edebe8 |
| generated/Hero.css | a5e258b64b58 | 3690cad08bd6 |
| generated/Testimonials.css | d518997abab0 | 13279359f10e |
| generated/tokens.css | b407ac1e6b8d | 2e2f681c6a8e |
| generated/tokens.ts | d7fe53a0257c | 8311a5c75a55 |
| generated/generated-manifest.json | c921a1048bbb | ffd454b2e3be |
| generator/generate.ts | 7de088a7d111 | b1e488d39d97 |
| generator/lib/ctx.ts | 349aafb1d480 | 6bef0d0a7e62 |
| generator/lib/types.ts | acc07fc07c9c | b54659dafbda |
| generator/emit/button.ts | 8857ce070cae | dd413c074c78 |
| generator/emit/cta.ts | f4e09fbf7dec | 90aa883605d1 |
| generator/emit/features.ts | 92914dad43c2 | f1e1ac970891 |
| generator/emit/hero.ts | 9f4855dedff4 | 7b34e7dceede |
| generator/emit/testimonials.ts | 8072de9a9e24 | d4a7cea67b8e |

All `.tsx` (Button, Hero, Testimonials, Features, Cta, Navbar, routes), copy.ts, runtime.ts, base.css, routes.css, Navbar.css, conflicts.ts, static.ts and fonts are byte-identical to r3. Also changed in `package.json` (scripts). In Hero/Features/Cta/Testimonials the 20px description `margin-top` is now `var(--fs-space-gap-5)` (same 20px): the generator's existing "spacing token when one equals the observed px" rule (`ctx.sp`) picks up the new token (assumption A2).

## Emitted CSS (new rules)

    /* tokens.css */ --fs-size-text-column-max: 768px; --fs-space-gap-5: 20px; --fs-space-grid-gap: 32px;
                     @media (max-width: 767.98px) { :root { ... --fs-space-grid-gap: 24px; } }
    /* Button.css */ .fs-button { ... gap: 12px; padding: 12px 24px; box-sizing: border-box; border: 1px solid var(--fs-color-scheme-border); ... line-height: var(--fs-font-lineHeight-body)... }   (no height)
    /* text column */ .fs-hero__text-inner | .fs-features__header | .fs-testimonials__header | .fs-cta__content { max-width: var(--fs-size-text-column-max); }
    /* Testimonials.css */ .fs-testimonials__header { width: 100%; max-width: ...; text-align: center; }   .fs-testimonials__grid { ... gap: var(--fs-space-grid-gap); }
                           .fs-testimonials__stars { ... margin-bottom: var(--fs-space-gap-5); }  .fs-testimonials__quote { ... margin-bottom: var(--fs-space-gap-5); }
                           .fs-testimonials__author { display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
                           @media (min-width: 768px) { .fs-testimonials__stars { margin-bottom: var(--fs-space-gap-6); } .fs-testimonials__quote { margin-bottom: var(--fs-space-gap-6); }
                                .fs-testimonials__author { flex-direction: row; align-items: center; gap: var(--fs-space-gap-4); } }
    /* Hero.css */ .fs-hero__col { ... left: var(--fs-layout-side-padding); right: var(--fs-layout-side-padding); ... }
                   .fs-hero__col--left .fs-hero__img { height: 36vw; }  .fs-hero__col--right .fs-hero__img { height: 33.6vw; }
                   @media (min-width: 768px) { left 33.6vw; right 31.2vw }   @media (min-width: 992px) { left 26.4vw; right 24vw }
                   (.fs-hero__img::before removed; .fs-hero__img { position: relative; min-height: 35vw } and the sm min-height: 0 kept)

## Verification

- `pnpm generate:r4` three times (plus once inside `pnpm build`): manifest sha256 `ffd454b2e3be695635ba9e01d2644898ffbe3ca3151b1eee29092e0495d5ee75` every time; `pnpm generate:verify:r4` OK twice (36 files identical). 57/57 SAC annotations consumed; 72 ungoverned entries (r3: 75); 37 tokens; token-integrity self-check passes.
- r3 regression: `generate:r3` on the revised generator reproduces every FROZEN-r3 file except `generated-manifest.json` (it embeds the generator hashes); likewise `generate:r2` vs FROZEN-r2 and `generate` (r1) vs FROZEN.md differ only in the manifest. The tree was regenerated as r4 afterwards.
- `pnpm lint` no errors (1 info: biome config migration), `pnpm typecheck` ok, `pnpm build` (generate:r4, app, ssr) ok. `pnpm serve` (4304) and `pnpm serve:ssr` (4305): HTTP 200 for /button /navbar /header80 /layout620 /testimonial37 /cta25 /page; both stopped (connection refused afterwards).
- Chromium probe against the SPA (throwaway script, deleted):
  - /button 1440: primary and secondary 95.83 x 50 px (padding 12px 24px, border 1px, line-height 24px).
  - Text column widths 1440 / 768 (block = heading box): hero 768 / 691.22; features 768 / 691.22; testimonials 768 / 691.22; CTA 768 / 691.22.
  - Hero image x | height (l1..l4, r1, r2): 375: 18.75 | 135, 213.75 | 135, 33.75 | 135, 258.75 | 135, 251.25 | 131.25, 71.25 | 131.25. 768: 38.39 | 258.05 (x4), 529.94 | 239.61, 161.30 | 239.61 (l1 38.39, l2 437.75, l3 69.11, l4 529.91). 1440: l1 72, l2 907.19, l3 129.59, l4 993.59, r1 1080 (right edge 1368), r2 331.22; heights 380.16 x4, 345.59 x2.
  - Testimonials grid gap / quote card (both quote cards identical): 375: gap 24px, card 337.5 x 299, stars->quote 20, quote->author 20, author column / flex-start / gap 0 (avatar->text 0). 768: gap 32px, card 691.22 x 221, stars->quote 24, quote->author 24, author row / center / gap 16 (avatar->text 16).
  - Grid `grid-template-columns` | distinct card x: 375: 337.5px | 18.75; 480: 204px 204px | 24, 252; 767: 333.141px 333.172px | 38.34, 395.48; 768: 329.609px x2 | 38.39, 400; 992: 4 x 199.203px | 49.59, 280.8, 512, 743.2; 1440: 4 x 296px | 80, 408, 736, 1064.

## Remaining designObservationVsIntent entries (9)

button.secondary.fill; button.width.stroke; container.fluid; features.grid-gap.sm; hero.text-offset.lg / .md / .sm; navbar.links.count; testimonials.order.below-lg. `testimonials.grid-gap.sm` is gone: observation 24px = token sm 24px. Note `button.width.stroke` text is unchanged from r3 and now partly stale (r4 Primary is 97px = label 47 + 50, i.e. it agrees with the rendered width, and its inner stroke is represented as 13/25 padding); I did not edit it (outside the task list).

## Assumptions and findings

- A1: `.fs-testimonials__header { width: 100% }` is emitted only when the DSC binds `textColumnMaxWidth`. The header is a flex item of a column container with `align-items: center`, so with only `max-width` it shrinks to its content (heading 466.88px at 1440 and 768, not the DSC's min(container, 768px)); r4's corrected Penpot Header is 768 / 691.2. One declaration, outside the literal task list; delete it from `emit/testimonials.ts` to revert. Features, hero and CTA needed nothing.
- A2: `ctx.sp` substitution (see above) is a side effect of adding `fs.token.space.gap.5`, not a requested change; the CSS values are unchanged.
- A3: the quote-card gaps are emitted as `margin-bottom` on stars and quote (names "starsGapBelow" / "quoteGapBelow"); r3 used `margin-top` on quote and author; the layout is the same box model.
- A4: tier keys of `quoteCard` follow the DSC note: sm = below 768 (base layer), md = 768 upward including lg. Hero image layers use the Tailwind prefixes of the DSC strings (base / md 768 / lg 992), as r3.
- A5: the hero column box now spans left..right insets with auto width; the images inside keep their vw widths and `left`/`right` offsets, so the 52vw / 58vw offsets etc. are relative to the inset edge, as in Relume.
- Environment note: `.tmp/` (a reference copy of the r3 tree, deleted) shows as tracked-then-deleted in `git status`, meaning something outside my commands snapshotted it into git; I ran no git write commands.
