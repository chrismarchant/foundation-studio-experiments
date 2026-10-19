# ARM-C-R3-NOTES: Arm C revision r3 (C-R3)

Input change: `../inputs/dsc/fs.ds.relume-default.r3.json` (revision `sha256:16fa9a00ebf3af917d4270869f42ee1a6ea06f36dd9565fa7efab05ba179738b`, supersedes r2). Only DSC-R3-01..04 plus metadata differ from r2 (checked by a sorted-key JSON diff). Isolation rule observed: only arm-c/**, inputs/** (read) and ARM-CONTRACT.md were touched; the harness was used only as a Playwright browser library by a throwaway script (deleted).

## Implementation changes

- C-R3-01 (DSC-R3-01 screens/breakpoints). `lib/types.ts`: `DscScreen`, optional `Dsc.screens`, `DscBreakpoint.screen`, `DscComponent.layout`. `lib/css.ts`: layers are now `base|sm|md|lg|xl`; min-widths come from `screens` (480/768/992/1280); `resp()` maps tiers to layers through `breakpoints[].screen` (lg->lg, md->md, sm->null->base) and throws if a tier min-width differs from its screen. `lib/ctx.ts` passes `dsc.screens`. `lib/tokens.ts`: `--fs-layout-container-max` is `screens[0].container` (100%) in `:root` plus one `@media (min-width: Npx)` block per screen whose container changes (lg 992px, xl 1280px); `tokens.ts` exports `screens`. Token overrides stay desktop-first (`max-width: tier minWidth - 0.02`), now 991.98 / 767.98. Hero JS query `(max-width: 767px)` and the assertion `md.minWidth === 768` are untouched.
- C-R3-02 (DSC-R3-02 hero image height). `emit/hero.ts`: `.fs-hero__img` gets `min-height: 35vw` (registered via `ctx.lit`, source `dsc:fs.section.hero.interaction.imageLayout.minHeightBelowScreen`) and `min-height: 0` in the layer named by `minHeightBelowScreen.screen` (sm).
- C-R3-03 (DSC-R3-03 hero text block). `emit/hero.ts`: when `layout.textBlock` exists, `.fs-hero__text` gets `padding-top`/`padding-bottom` from `ctx.bound(F, id, textBlock.paddingTopBinding|paddingBottomBinding)` (`var(--fs-space-hero-text-top|bottom)`); `align-items: center` kept; responsive values come from tokens.css. `emit/conflicts.ts`: `hero.text-offset.*` intent/resolution rewritten (observed strings unchanged, "DSC wins" kept); in addition the `container.fluid` resolution text now lists `screens[].container` (it said "max-width 1280px (lg container)", which is no longer true) - see assumption A2.
- C-R3-04 (DSC-R3-04 testimonials grid). `emit/testimonials.ts` reads `layout.grid`: base/sm/md/lg rules emitted per screen (columns 1 -> `minmax(0, 1fr)`, n -> `repeat(n, minmax(0, 1fr))`, rows n -> `repeat(n, minmax(0, 1fr))`, rows "auto" -> no declaration), quote-card span from `quoteCardSpan.fromScreen` (now sm), order/class/const names from `orderBelowScreen` (index 2, lg; names unchanged: `--last-below-lg`, `LAST_BELOW_LG_INDEX`). `generate.ts`: the literal scan exempts `grid-template-rows` like `grid-template-columns`.
- C-R3-05 (translation correction of C-R3-04, owner decision on finding F1). `emit/testimonials.ts`: for a DSC that carries `layout.grid`, the base rule `columns: 1` emits NO `grid-template-columns`; it describes the implicit single column. Rationale (F1): DSC-R3-04's changeLog says "with a four-row template and no explicit columns, a two-column span forces the implicit grid to two columns from sm" and "r1/r2 emitted explicit columns only"; its provenance lists no base column utility. My first reading emitted `grid-template-columns: minmax(0, 1fr)` at base, an explicit one-track template, so the sm span created an auto-sized second track (unequal 230/170px at 480). Sm rows, md/lg columns, lg rows and the sm span are unchanged; no `grid-auto-columns` added. r1/r2 (no `layout.grid`) keep their explicit one-track base template (re-checked: `generate:r2` reproduces the FROZEN-r2 hashes of Testimonials.css and tokens.css).
  - before: `.fs-testimonials__grid { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--fs-space-gap-8); ... }`
  - after:  `.fs-testimonials__grid { width: 100%; display: grid; gap: var(--fs-space-gap-8); ... }` (sm, md and lg layers as under "Emitted CSS")
- Scripts: `generate:r3`, `generate:verify:r3` added; `build` runs `generate:r3`; `generate`, `generate:r2`, `generate:verify*` unchanged (bare `generate` still r1).
- Backward compatibility (not asked, needed so r1/r2 stay reproducible): every r3 read is optional (`screens`, `minHeightBelowScreen`, `layout.textBlock`, `layout.grid` fall back to the r2 behaviour). Checked before generating r3: `generate:verify:r2` differed only in `generated-manifest.json` (it embeds the generator hashes), i.e. all other r2 files were reproduced byte-for-byte.

## Files changed (sha256, first 12 hex; r2 -> r3)

| file | r2 | r3 |
|---|---|---|
| generated/tokens.css | aa223c5329b4 | b407ac1e6b8d |
| generated/tokens.ts | 6c49e96848a9 | d7fe53a0257c |
| generated/Hero.css | c72e316e8b27 | a5e258b64b58 |
| generated/Testimonials.css | 8742e285d42d | d518997abab0 |
| generated/Features.css | 70a6163c0e5f | 7d3ec72e4ea2 |
| generated/Navbar.css | 4371c6c88a95 | 105b60a0b72d |
| generated/generated-manifest.json | ca252861b975 | c921a1048bbb |
| generator/generate.ts | db060fca735e | 7de088a7d111 |
| generator/lib/css.ts | ca567282e818 | 604aa61838a0 |
| generator/lib/ctx.ts | cd4d8e7f5967 | 349aafb1d480 |
| generator/lib/tokens.ts | 5cf36d7e87f9 | 5cb2b2601d11 |
| generator/lib/types.ts | 08c21fb5b040 | acc07fc07c9c |
| generator/emit/hero.ts | ad7503c998bf | 9f4855dedff4 |
| generator/emit/testimonials.ts | b73142608419 | 8072de9a9e24 |
| generator/emit/conflicts.ts | 12af354105bb | 423d7c237ba9 |
| generator/emit/static.ts | 5cd55963b46d | 14ec891c4e6d |

Features.css and Navbar.css changed only because their lg layer is now `@media (min-width: 992px)` (was 1024px; DSC lg.minWidth). Hero.tsx, Testimonials.tsx, Cta.*, Button.*, routes.*, base.css, runtime.ts, copy.ts and fonts are byte-identical to r2.

## Emitted CSS (new rules)

    /* tokens.css */  --fs-layout-container-max: 100%;
    @media (min-width: 992px)  { :root { --fs-layout-container-max: 992px; } }
    @media (min-width: 1280px) { :root { --fs-layout-container-max: 1280px; } }
    @media (max-width: 991.98px) { :root { --fs-space-hero-text-bottom: 96px; --fs-space-hero-text-top: 96px; --fs-space-section-lg: 96px; } }
    @media (max-width: 767.98px) { :root { --fs-space-hero-text-top: 64px; --fs-space-section-lg: 64px; } }
    /* Hero.css */
    .fs-hero__text { ... padding-inline: var(--fs-layout-side-padding); padding-top: var(--fs-space-hero-text-top); padding-bottom: var(--fs-space-hero-text-bottom); ... }
    .fs-hero__img { position: relative; min-height: 35vw; }
    @media (min-width: 480px) { .fs-hero__img { min-height: 0; } }
    /* Testimonials.css */
    .fs-testimonials__grid { ... display: grid; gap: var(--fs-space-gap-8); ... }   (no base columns, C-R3-05)
    .fs-testimonials__card--last-below-lg { order: 1; }
    @media (min-width: 480px) { .fs-testimonials__grid { grid-template-rows: repeat(4, minmax(0, 1fr)); }
                                .fs-testimonials__card--quote { grid-column: span 2; } }
    @media (min-width: 768px) { .fs-testimonials__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } ... }
    @media (min-width: 992px) { .fs-testimonials__grid { grid-template-columns: repeat(4, minmax(0, 1fr));
                                grid-template-rows: repeat(2, minmax(0, 1fr)); } .fs-testimonials__card--last-below-lg { order: 0; } ... }

## Verification

- `pnpm generate:r3` twice: manifest sha256 `c921a1048bbb67207a99de9561d4776aeb65c82c2b058ec8c895235b67fceea6` both times; `pnpm generate:verify:r3` OK (36 files identical) twice. 57/57 SAC annotations consumed; 75 ungoverned entries (r2: 74, +`min-height 35vw`); 34 tokens.
- `pnpm lint` no errors (1 info), `pnpm typecheck` ok, `pnpm build` (generate:r3 + app + ssr) ok. `pnpm serve` (4304) and `pnpm serve:ssr` (4305): HTTP 200 for /button /navbar /header80 /layout620 /testimonial37 /cta25 /page; both stopped (connections refused afterwards).
- Chromium probe against the SPA (throwaway script, deleted; testimonials re-run after C-R3-05). Testimonials grid (cols | rows | distinct card x): 375: 337.5px | 6 auto rows | 1; 480: 200px 200px | 4x232px | 2; 767: 329.14px 329.17px | 4x205px | 2; 768: 329.6px 329.6px | 4x221px | 2; 991: 2x429.95px | 4x221px | 2; 992: 4x199.2px | 2x248px | 4; 1279: 4x224px | 2x248px | 4; 1280: 4x264px | 2x248px | 4; 1440: 4x296px | 2x221px | 4. Other measurements are unchanged from the first r3 run: `.fs-testimonials__container` width: 992 -> 892.8 (5% padding binds), 1279 -> 992 (max 992px), 1280 -> 1152, 1440 -> 1280. Hero `.fs-hero__img` heights at 375: 135, 135, 131.25, 131.25, 131.25, 131.25 (35vw = 131.25); at 480: 172.8, 172.8, 161.27, 149.75, 161.27, 149.75 (aspect only, min-height 0). `.fs-hero__text` padding-top/bottom: 375 64/96, 768 96/96, 1440 112/112. `/layout620` section padding-top: 991 -> 96px, 992 -> 112px.

## Remaining designObservationVsIntent entries (10)

button.secondary.fill; button.width.stroke; container.fluid (resolution text updated to screens[].container); features.grid-gap.sm; hero.text-offset.lg / .md / .sm (intent now the padded-stage centring rule; net shift 0 / 0 / -16px); navbar.links.count; testimonials.grid-gap.sm; testimonials.order.below-lg.

## Assumptions and findings

- A1: `--fs-layout-container-max` below the first screen takes the first screen's container (100%); the DSC states "100% below sm" only in provenance text.
- A2: the `container.fluid` text change was not in the task list; it is a description-only edit (no CSS effect) because the old text would be false under r3.
- A3: the sm layer (480..767) uses the tier `sm` token values (tier boundaries are 0/768/992), so hero paddings and gaps change at 768, not 480; only the screen-keyed rules (hero min-height, grid rows, quote span) change at 480.
- F1: resolved by C-R3-05 (above). Equal columns now hold from 480 (200/200px) to 767 (329.14/329.17px; the 0.03px difference is the auto tracks sizing to content).
- F2: with `quoteCardSpan` from sm and four rows, the DOM order puts the index-2 quote card in the last row at sm/md (CSS order 1), as the DSC specifies.
- Relume `gap-6` below md (deferred item 1) and the hero text width (deferred item 2) are untouched.
