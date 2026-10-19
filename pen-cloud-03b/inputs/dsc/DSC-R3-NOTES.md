# DSC r3 specification note (PEN-CLOUD-03-B)

File: `inputs/dsc/fs.ds.relume-default.r3.json`
Revision: `sha256:16fa9a00ebf3af917d4270869f42ee1a6ea06f36dd9565fa7efab05ba179738b`
Supersedes (r2): `sha256:4243b7aa087b568fcf16cfab27ec72a2f3d04fc13fb5ff81c06c98ae8393cf25`
Created: 2026-10-19T00:00:00Z

## Build

    python3 scripts/build-dsc-r3.py

Canonical JSON (sorted keys, no whitespace) is hashed with `revision` empty; the file is then written
pretty-printed (indent=1) with the revision filled in. Re-running is byte-identical. The `supersedes`
value is read from the r2 file. Token entries: 34 (r2: 32, plus two hero spacing tokens).

## What changed

- DSC-R3-01 Breakpoint model (D-3). New top-level `screens` and `screensProvenance` from
  `@relume_io/relume-tailwind` 1.3.0 (`theme.screens`: sm 480, md 768, lg 992, xl 1280, xxl 1440;
  `theme.container.screens`: sm 100%, md 100%, lg 992px, xl 1280px). `breakpoints` keeps its three design
  tiers (the Penpot canvases 1440/768/375); `lg.minWidth` 1024 -> 992, `screen` field added
  (lg -> "lg", md -> "md", sm -> null), and `breakpointsNote` added.
- DSC-R3-02 Hero image height (D-4 part 1). `fs.section.hero` `interaction.imageLayout` gains
  `minHeightBelowScreen {screen: sm, value: 35vw}`. Below screens.sm (480px) each hero image box has
  min-height 35vw in addition to the 120% aspect padding (Relume `h-[35vw] pt-[120%] sm:h-auto`, border-box,
  so height = max(35vw, 1.2 x width)); from sm the aspect alone applies. The r2 result record stated the
  threshold as 640px; the preset's sm screen is 480px.
- DSC-R3-03 Hero text block (D-4 part 2). Tokens `fs.token.space.hero.text-top` (112px; md 96px; sm 64px;
  `pt-16 md:pt-24 lg:py-28`) and `fs.token.space.hero.text-bottom` (112px; md 96px, sm inherits md;
  `pb-24 lg:py-28`). Hero bindings `textPaddingTop` / `textPaddingBottom` and a `layout.textBlock` rule:
  the text block is vertically centred in the sticky stage's padded content box. Relume model: full-height
  flex container, items-center, pt-16 pb-24 (sm), pt-24 pb-24 (md), py-28 (lg).
- DSC-R3-04 Testimonials grid (D-5). `fs.section.testimonials` gains `layout.grid`: `minmax(0, 1fr)` tracks;
  cumulative mobile-first rules (base 1 column / auto rows; sm 4 rows; md 2 columns; lg 4 columns, 2 rows);
  quote card spans 2 columns from sm; card index 2 is `order-last` below lg; explicit rows are equal fr
  tracks with cards stretched. With a four-row template and no explicit columns, a two-column span forces
  the implicit grid to two columns from sm. Provenance: Relume Testimonial37
  `grid gap-6 sm:grid-rows-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:grid-rows-2`, quote card `sm:col-span-2`,
  index 2 `order-last lg:order-none`.

Everything else (tokens, other bindings, components, interaction blocks, provenance, acceptance) is
unchanged from r2.

## Observed but deferred (owner decision required)

1. The Relume model for the testimonial grid uses `gap-6` (24px) below md and `gap-8` (32px) from md
   (`md:gap-8`), while the DSC binds `gridGap` on `fs.section.testimonials` to `fs.token.space.gap.8` at every
   tier. Left unchanged in r3.
2. The Relume hero text container is `container max-w-lg`, where the preset's `maxWidth.lg` is 48rem (768px),
   while the DSC/Penpot observation gives the hero text column a width of 512px. No hero text width is
   specified or changed in r3.
