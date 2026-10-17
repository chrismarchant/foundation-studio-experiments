# ARM-C-R2-NOTES: Arm C revision r2

Input change: `../inputs/dsc/fs.ds.relume-default.r2.json` (revision `sha256:4243b7aa087b568fcf16cfab27ec72a2f3d04fc13fb5ff81c06c98ae8393cf25`, supersedes r1). DSC-R2-01 removes the md/sm font-size overrides for h1/h2/h4 (h1 48/40, h2 40/36, h4 28/24); everything else is identical to r1.

## Implementation change C-R2-01 (input binding only)

`generator/generate.ts` gained a DSC selector: `--dsc <path relative to ../inputs>` (also `--dsc=<path>`) or the `FS_DSC` env var. Default remains `dsc/fs.ds.relume-default.r1.json`. No other generator change; no emitter changed. Check performed: generating with the default (r1) reproduced every r1-frozen file byte-for-byte except `generator/generate.ts` itself (changed by this edit) and `generated-manifest.json` (it embeds the generator hash). So r1 output stays reproducible from the r1 option, but `FROZEN.md` hashes of `generate.ts` and the manifest no longer match the current generator source by construction.

## Scripts

Added `generate:r2` and `generate:verify:r2` (both pass `--dsc dsc/fs.ds.relume-default.r2.json`). `build` now runs `generate:r2` (previously `generate`). `generate` / `generate:verify` still mean r1. NOTE: since the tree now holds r2 output, `pnpm generate:verify` (r1) fails against it by design; use `generate:verify:r2`.

## Generated files whose sha256 changed (r1 -> r2)

| file | r1 | r2 | why |
|---|---|---|---|
| app/src/generated/tokens.css | 80e8c489548c | aa223c5329b4 | h1/h2/h4 no longer appear in the md/sm `@media` blocks (only `--fs-space-section-lg` overrides remain), so the desktop type ramp (56/48/32) holds at every width |
| app/src/generated/tokens.ts | 17d86fb772d0 | 6c49e96848a9 | `responsive` map dropped from font.size.h1/h2/h4 |
| app/src/generated/generated-manifest.json | c8b45a7b59d7 | ca252861b975 | DSC revision, DSC input hash, tokens.ts/tokens.css hashes, generator hash (generate.ts), and `designObservationVsIntent` (20 -> 10 items: the 10 heading-size conflicts for h1/h2/h4 at md/sm disappear because the observation now matches the intent) |
| generator/generate.ts | 880d26128171 | db060fca735e | C-R2-01 |

All component `.tsx/.css`, `base.css`, `runtime.ts`, `copy.ts`, `routes.*` are byte-identical to r1 (they reference `var(--fs-font-size-*)`, so the responsive change lives only in tokens.css). Fonts unchanged.

## Verification (r2)

`pnpm generate:r2` twice: manifest sha256 `ca252861b975e6b9615919124fdc1416e8f98fa3eee39dba55ccf19802da23c5` both times; `pnpm generate:verify:r2` twice: OK (36 files identical). `pnpm lint` no errors, `pnpm typecheck` ok, `pnpm build` (r2 generation + app + ssr) ok. `pnpm serve` (4304) and `pnpm serve:ssr` (4305): 200 on /button /navbar /header80 /layout620 /testimonial37 /cta25 /page; SSR /header80 contains the server-rendered h1. Servers stopped. Remaining design-observation conflicts (10) are unrelated to type sizes (secondary fill, button width, hero text offset, container, navbar links, testimonials order/gap, features sm gap). ARM-C-NOTES.md (r1) is left as written and describes r1.
