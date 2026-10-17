# PEN-CLOUD-03-B acceptance harness

Measures the arms of the experiment (A Relume React control, B Penpot code output, B' React variant, C Foundation Studio generated, C-SSR) against the same routes, viewports and thresholds. Built to the contract in `../ARM-CONTRACT.md`; token ids and breakpoints come from `../inputs/dsc/fs.ds.relume-default.r1.json`, copy from `../inputs/copy.json`.

## Setup and run

```sh
cd harness
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile   # @playwright/test pinned to 1.56.1 -> Chromium 1194 in /opt/pw-browsers
pnpm run harness -- --arms A,B,Bp,C,Cssr --out ../results/run-<label>
pnpm run harness -- --dry-run                     # stub arms + fixtures, no real arm needed (~4 min for 3 arms)
node summarise.mjs ../results/run-<label>         # regenerate summary.json / summary.md from a run dir
```

Pinned: `@playwright/test 1.56.1`, `pixelmatch 8.0.0`, `pngjs 7.0.0`, `@axe-core/playwright 4.14.0`, `ssim.js 3.5.0` (lockfile committed). Do not run `playwright install`.

Options: `--steps build,pages,responsive,scroll,visual,determinism,licence` (default: all except licence), `--licence` (adds the licence step), `--skip-build`, `--routes r1,r2` (debug subset of the per-page measurements), `--no-summary`, `--label`. Arms run in the order A,B,Bp,C,Cssr regardless of the order given. Re-running with `--out` on an existing run dir adds to it (`run.json` keeps a `history`); that is how the licence step is run later: `pnpm run harness -- --steps licence --out ../results/run-<label>` (after C is frozen).

Per arm: `pnpm build` once per build group (A; B shared by B/B'; C shared by C/C-SSR; prefers `app/` when it has a build script, else the arm root) -> start server (the arm must define the script and listen on its contract port by itself; A `pnpm serve` in `/home/user/pc03b-arm-a/app`; B `pnpm serve` and B' `pnpm serve:react` in `../arm-b`; C `pnpm serve` and C-SSR `pnpm serve:ssr` in `../arm-c`) -> wait for the port (90 s) -> measure -> kill the server's process group. A port already serving before start aborts that arm (`error.json`). Arms B/B' are requested with `?bp=tablet` (768) and `?bp=mobile` (375); sweep widths map via the DSC breakpoints (>=1024 none, >=768 tablet, else mobile). Browser: Chromium headless, deviceScaleFactor 1, `en-GB`, `UTC`, light, `reducedMotion: no-preference` (the reduced-motion check uses a fresh context).

## Output layout (`<out>/`)

| File | Content |
|---|---|
| `run.json` | label, steps, arms, ports, browser config/version, DSC revision, `history` of earlier invocations on this dir |
| `<arm>/<route>-<width>.png` | full-page screenshots (animations disabled, caret hidden), 7 routes x 3 widths |
| `<arm>/diff/<route>-<width>.png` | pixelmatch diff images vs A |
| `<arm>/build.json` + `build.{stdout,stderr}.txt` | exit code, duration, bundle sizes of `dist` (per file, per extension, gzip) |
| `<arm>/page-meta.json` | per route/width: HTTP status, fonts state (`source_sans_3_loaded`, faces with status), external requests, console/page errors, document height, screenshot path |
| `<arm>/dom-roles.json` | per route/width: `roles[]` = ordered `{tag, role, explicitRole, level, text(40), ariaLabel, dataFsId, dataFsBbc, dataFsPenpot, visible, section}` for landmarks, `[role]`, h1-h6, buttons, links; `tagCounts`; `counts` (nav/h1..h6/button/link); `semantic` = `{score, visibleScore, expected, actual, missing[], perSection (page), h1Count (page)}` |
| `<arm>/geometry.json` | per route/width: `subject` (box + computed `display, flex-direction, gap, padding, font-family, font-size, background-color, border-radius`), `children` (first level, same data), `sections`, `elements[]` (boxes of the role elements), `columns.layout620` (distinct h3 x), `columns.testimonial37` (distinct x of the grid's direct children), `fsIds[]` (C-only attributes), `doc` |
| `<arm>/responsive.json` | widths 375..1440 step 64 (+1440) at height 900 for layout620, testimonial37, header80, page: `scrollWidth`/`innerWidth`/`overflowX`, `subject.paddingTop`, per-section padding/box, `columns`, `stage` (sticky stage height vs `innerHeight`) |
| `<arm>/scroll-probe.json` | per viewport: `samples[]` for p = 0, .25, .5, .75, 1 (`scrollY`, `left`/`right` = raw `transform`, parsed `tx/ty`, `offsetHeight`, `translateYPct`, `identity`; `stage` = bounding top/height/innerHeight), `hasTransform`, `stickyFound`, `reducedMotion` (p = 0.5, fresh context, `identity`, `mediaMatches`) |
| `<arm>/token-integrity.json` | `arm_level` = `{varDecls, literalDecls, otherVarDecls, neutralDecls, mixedVarDecls, boundShare, boundShareStrict, literalSamples, unreadableSheets}` over the union of applied declarations; `perPage`; for C/C-SSR also `tokens` = DSC vs computed `:root` custom properties (`mismatches`, `missing`, `extraFsVars`, `resolvedNames`) |
| `<arm>/visual.json` | vs A per route/width: `mismatchRatio` (pixelmatch 0.1, includeAA false, union canvas, white padding), `ssim` (ssim.js defaults, same padded canvas), `heightDiff`, `widthDiff`, sizes, `diffPng` |
| `<arm>/accessibility.json` | axe violations (id, impact, node count, targets) and `byImpact`; `focusVisible` on the first button (reached by Tab); `tabSequence` for navbar and cta25 |
| `C/determinism.json` | `generate:verify` exit code, hashes of `app/src/generated/**` and the comparison to `FROZEN.md`, two-build bundle reproducibility (reported separately) |
| `C/licence.json` | line-hash overlap (hashes and C-side file:line only, never the lines) and the forbidden-string scan of the experiment directory |
| `summary.json`, `summary.md` | PASS/FAIL per arm x route x dimension |

## Definitions and assumptions worth knowing

- **Section location** (page route, and column heuristics): each section is found by its copy text (`inputs/copy.json` headings, first `nav` for the navbar) and grown to the largest ancestor containing no other section's anchor. Works for every arm because the copy is identical.
- **Semantic score**: expected roles per route (`navbar` nav+1 button; `header80` h1+2 buttons; `layout620` h2+3 h3+1 button+1 link; `testimonial37` h2; `cta25` h2+2 buttons; `button` 2 buttons; `page` = per-section expectations + exactly one h1). Score = sum(min(actual, expected)) / sum(expected). Roles are computed (explicit `role` else implicit by tag; `<a href>` = link). A Relume link-variant `<button>` therefore counts as a button, not a link. Role-tree equality to A compares `tag|role|level|text` over the whole list (`visibleTreeEqualA` is also recorded).
- **Scroll probe**: "section" = the nearest ancestor of the sticky stage that is taller than the stage (falls back to the subject root when nothing is sticky, e.g. Arm B); the target is `top + p*(height - innerHeight)` using the absolute top. Animation threshold compares `translateY / offsetHeight` (percent of the column height) of each arm against A, tolerance 2 percentage points.
- **Token integrity**: only declarations on governed properties (colour, background-color, border-*-color, font-size, padding*, gap/row/column-gap, border-radius, line-height, font-weight, font-family) in rules whose selector matches the page, inside currently-applying `@media`/`@supports`, plus inline `style` attributes. Classes: `var` (contains `var(--fs-`), `literal`, `otherVar` (a bare non-`--fs` var()), `neutral` (inherit, currentColor, transparent, none, normal, auto, 0). `boundShare = var/(var+literal)`; `boundShareStrict` also counts `otherVar` as unbound. Union over all routes/viewports. DSC var names are resolved by squashing separators and case (`fs.token.color.scheme.text` matches `--fs-color-scheme-text` or `--fs-token-color-scheme-text`); values are normalised (hex/rgb, rem->px, quotes, spaces).
- **FROZEN.md parsing**: any line containing a 64-hex SHA-256 and a path-like token is an entry (markdown table or plain list); files are matched by path suffix. If the real FROZEN.md uses another format (e.g. one aggregate hash), `frozen.aggregateFound` tests a SHA-256 over sorted `path hash` lines and the summary will show a FAIL with the unmatched entries: adjust `parseFrozen` in `src/determinism.mjs`.
- **Licence step** is supplementary evidence, not proof. It reads `/home/user/pc03b-arm-a/relume-src` only to hash trimmed lines >= 40 chars. The forbidden strings are assembled at runtime so this harness never contains them.
- Axe runs with default rules on the loaded page (no tag filter); the pass criterion counts serious+critical only.

## Dry run

`--dry-run` starts in-process stub servers on ports 4391..4395 (plain page for A, static-columns page honouring `?bp=` for B/B', `--fs-*` token page with `data-fs-*` for C/C-SSR), builds fixtures (a tiny `arm-c` with `generate:verify`, `build`, `FROZEN.md`, and a fake `relume-src` sharing one planted line), runs every step, runs `summarise`, then asserts ~140 invariants (`dry-run-assertions.json`). Output goes to `harness/.dry-run-out/` (git-ignored). The stub arms are not a reference implementation: their PASS/FAIL in `summary.md` is meaningless.
