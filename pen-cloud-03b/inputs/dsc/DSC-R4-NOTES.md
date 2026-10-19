# DSC r4 specification note (PEN-CLOUD-03-B)

File: `inputs/dsc/fs.ds.relume-default.r4.json`
Revision: `sha256:066de30691c0d123b8bf5682200b533f7e459b41afb1e50254e48bdbc2318ae2`
Supersedes (r3): `sha256:16fa9a00ebf3af917d4270869f42ee1a6ea06f36dd9565fa7efab05ba179738b`
Created: 2026-10-19T12:00:00Z
Authority: PEN-CLOUD-03-B run r3 defect attribution D-11..D-15; owner ruling OD-50 (Penpot reconciliation).

## Build

    python3 scripts/build-dsc-r4.py

Canonical JSON (sorted keys, no whitespace) is hashed with `revision` empty; the file is then written
pretty-printed (indent=1) with the revision filled in. Re-running is byte-identical for a given set of input
files. `supersedes` is read from the r3 file. Token entries: 37 (r3: 34, plus three). `screensProvenance` is
unchanged (designated provenance field, OD-47). The Relume values below come from the Relume Tailwind preset 1.3.0.

## What changed

- DSC-R4-01 Text column width (D-11). Token `fs.token.size.text-column.max` (sizing, 768px; `max-w-lg`, preset
  maxWidth.lg = 48rem) and binding `textColumnMaxWidth` on hero, features, testimonials and CTA. The section
  text column is min(container width, 768 px), centred where the section centres it and left-aligned in
  features. Replaces the 512 px design observation (default max-w-lg) carried by the Penpot boards in r1-r3.
- DSC-R4-02 Button sizing (D-14). Primary and secondary `geometry` is now height 50, paddingX 24, paddingY 12,
  gap 12, strokeWidth 1, labelLineHeight 24, sizing `padding`, plus `sizingRule` (border-box height =
  paddingY x 2 + labelLineHeight + strokeWidth x 2 = 50). Relume `px-6 py-3` with a 1 px border and a 24 px
  line height renders 50 px; the Penpot mains were 48 px with an inner stroke (inner stroke represented inside
  the padding: 13/25 px).
- DSC-R4-03 Mobile quote-card spacing (D-15). Token `fs.token.space.gap.5` (spacing, 20px; `gap-5 / mb-5 /
  mt-5`) and `fs.section.testimonials` `layout.quoteCard`: stars and quote gaps gap.5 below md and gap.6 from
  md; author block column / start / gap 0 below md, row / center / design-observation gap from md. Only the sm
  tier is governed in r4. The Penpot mobile board carried a row author with a 16 px gap and 24 px spaces.
- DSC-R4-04 Hero image columns (D-13). `interaction.imageLayout` gains `columnInset` (`layout.sidePadding`),
  `aspectBase` (`column`), `aspectBaseRule` and `columnInsetRule`. Relume's columns are absolutely positioned
  inside a section with 5 % side padding, and percentage padding resolves against the shrink-wrapped column,
  so the 120% aspect resolves against the widest image of the column (same height for every image in a
  column). r1-r3 placed the columns at the stage edge and resolved the aspect per image.
- DSC-R4-05 Tier-aware grid gap (D-12). Token `fs.token.space.grid.gap` (spacing, 32px; sm 24px; `gap-6
  md:gap-8`). The testimonials `gridGap` binding moves to it; the features `gridGap` stays on
  `fs.token.space.gap.8`.

## Provenance and pending value

`provenance` has a fourth entry, `penpot-reconciliation` (ruling OD-50, record `PEN-CLOUD-03-B-R4-RESULT.md`,
corrected structure `inputs/penpot/structure.r4.json`). Its `capturedAt` is read from that file when it exists.
It does not exist yet, so `capturedAt` is `"pending"` and the revision above is for the pending state. After
the corrected observations are captured, re-run the build command: `capturedAt` is filled in and the revision
changes.
