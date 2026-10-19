# PEN-CLOUD-03-B acceptance summary

Criteria: **r3** (= r2: semantic roles only; section padding; root-relative FROZEN; import lines excluded - plus D-6 token accounting and D-7 FROZEN/verify-script selection)

Determinism inputs: FROZEN file **FROZEN-r4.md**; verify script **generate:verify:r4**; manifest dsc.revision `sha256:6defaaa003c0d979526811cf6fa0a40f35b1f3ee9a726c0d77c27eb06ecc8918`; basis: FROZEN-r4.md declares DSC revision == manifest dsc.revision; generate:verify:r4 runs --dsc dsc/fs.ds.relume-default.r4.json whose revision == manifest dsc.revision

Token accounting (C): rule r3; governed share 100%; coverage strict 0 / loose 14 / viaShorthand 1 / uncovered 0; zero-length neutral 5; stored (r3 measurement)

Token accounting (Cssr): rule r3; governed share 100%; coverage strict 0 / loose 14 / viaShorthand 1 / uncovered 0; zero-length neutral 5; stored (r3 measurement)

Run: `run-r4`  ·  generated 2026-10-19T09:45:34.046Z  ·  reference arm A present

## Verdict (required checks)

| Arm | PASS | FAIL | MISSING | stretch PASS/FAIL |
|---|---|---|---|---|
| A | reference | | | |
| B | 16 | 13 | 0 | 0/7 |
| Bp | 16 | 13 | 0 | 0/7 |
| C | 41 | 1 | 0 | 5/2 |
| Cssr | 38 | 0 | 0 | 5/2 |

## A reference anomalies

Defects in the Relume control itself (arm A). They are not C defects and are not scored; they are listed so they are not mistaken for C results.

- **A semantic score below 1:** 
  - navbar @1440: score 0.5; missing [{"role":"nav","expected":1,"actual":0}]
  - navbar @768: score 0.5; missing [{"role":"nav","expected":1,"actual":0}]
  - navbar @375: score 0.5; missing [{"role":"nav","expected":1,"actual":0}]
  - layout620 @1440: score 0.8333; missing [{"role":"link","expected":1,"actual":0}]
  - layout620 @768: score 0.8333; missing [{"role":"link","expected":1,"actual":0}]
  - layout620 @375: score 0.8333; missing [{"role":"link","expected":1,"actual":0}]
  - testimonial37 @1440: score 0; missing [{"role":"h2","expected":1,"actual":0}]
  - testimonial37 @768: score 0; missing [{"role":"h2","expected":1,"actual":0}]
  - testimonial37 @375: score 0; missing [{"role":"h2","expected":1,"actual":0}]
  - page @1440: score 0.6875; missing [{"section":"navbar","role":"nav","expected":1,"actual":0},{"section":"navbar","role":"button","expected":1,"actual":0},{"section":"layout620","role":"link","expected":1,"actual":0},{"section":"testimonial37","role":"h2","expected":1,"actual":0},{"role":"h1","expected":"exactly 1","actual":2}]; h1 count 2
  - page @768: score 0.6875; missing [{"section":"navbar","role":"nav","expected":1,"actual":0},{"section":"navbar","role":"button","expected":1,"actual":0},{"section":"layout620","role":"link","expected":1,"actual":0},{"section":"testimonial37","role":"h2","expected":1,"actual":0},{"role":"h1","expected":"exactly 1","actual":2}]; h1 count 2
  - page @375: score 0.6875; missing [{"section":"navbar","role":"nav","expected":1,"actual":0},{"section":"navbar","role":"button","expected":1,"actual":0},{"section":"layout620","role":"link","expected":1,"actual":0},{"section":"testimonial37","role":"h2","expected":1,"actual":0},{"role":"h1","expected":"exactly 1","actual":2}]; h1 count 2
- **A axe serious/critical:** 
  - navbar @1440: button-name (critical, 1 nodes)
  - navbar @768: button-name (critical, 1 nodes)
  - navbar @375: button-name (critical, 1 nodes)
  - page @1440: button-name (critical, 1 nodes)
  - page @768: button-name (critical, 1 nodes)
  - page @375: button-name (critical, 1 nodes)

## Dimension matrix

| Dimension | A | B | Bp | C | Cssr |
|---|---|---|---|---|---|
| build | REF | PASS (1) | PASS (1) | PASS (1) | PASS (1) |
| fonts | REF | PASS (7) | PASS (7) | PASS (7) | PASS (7) |
| semantic | REF | FAIL (7/14) | FAIL (7/14) | PASS (7) | PASS (7) |
| responsive | REF | FAIL (4/4) | FAIL (4/4) | PASS (4) | PASS (4) |
| animation | REF | FAIL (2/3) | FAIL (2/3) | PASS (3) | PASS (3) |
| tokens | REF | info | info | PASS (9) | PASS (9) |
| accessibility | REF | PASS (7) | PASS (7) | PASS (7) | PASS (7) |
| visual |  | FAIL (7/7) | FAIL (7/7) | FAIL (2/7) | FAIL (2/7) |
| determinism |  |  |  | PASS (3) |  |
| licence |  |  |  | FAIL (1/3) |  |

## Thresholds

- **reference**: A (Relume React control) at the same route/viewport
- **semantic**: score = 100% of SAC-expected roles present at every viewport (role tree vs A is informational: the control has its own defects)
- **responsive**: column counts and padding-top of the nearest <section> (or data-fs-id section root) containing the route heading equal to A at every sweep width (the 64px series 375..1440 plus every DSC screens[]/breakpoints[] minWidth and minWidth-1 inside 375..1440) and no horizontal overflow
- **animation**: translateY within 2 percentage points of column height of A at every probe sample; sticky stage = viewport (height == innerHeight, top == 0); reduced motion gives identity transform
- **tokenIntegrity**: C only: boundShare over DSC-governed declarations = 100% and 0 DSC token mismatches/missing. D-6 accounting: zero lengths (0, 0px, 0rem, 0em, 0%, -0px, all-zero multi-values) are neutral; a literal is excluded when generated-manifest.json ungoverned[] covers it (strict: same file basename; loose: stylesheet not identifiable; viaShorthand: each non-zero component covered on its axis, padding-left/right <-> padding-inline, padding-top/bottom <-> padding-block, row/column-gap <-> gap, border-*-radius <-> border-radius, and the shorthands); raw share is informational
- **visual**: STRETCH: pixel mismatch <= 1% (pixelmatch threshold 0.1, includeAA false); SSIM and height difference reported
- **accessibility**: 0 serious or critical axe violations per route/viewport
- **determinism**: C only: the FROZEN*.md whose "DSC revision:" equals generated-manifest.json dsc.revision and the generate:verify* script whose --dsc file has that revision are selected and recorded (D-7); that script exits 0; every entry of the selected FROZEN file (paths relative to the arm-c root) found on disk with an equal SHA-256; (bundle reproducibility reported separately)
- **licence**: C only: 0 matching lines >= 40 chars against Arm A reference source excluding pure import/export-from lines (reported separately); 0 forbidden-string hits (supplementary, not proof)
- **build**: pnpm build exit code 0
- **fonts**: Source Sans 3 face loaded (document.fonts) on every page

## build

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | - | pnpm build exit code | exit 0; .css 19482B (gz 4206B), .js 409868B (gz 130715B) | exit 0 | **PASS** |
| B | - | pnpm build exit code | exit 0; no dist found | exit 0 | **PASS** |
| Bp | - | pnpm build exit code | exit 0; no dist found | exit 0 | **PASS** |
| C | - | pnpm build exit code | exit 0; .js 378893B (gz 119512B), .css 21084B (gz 3193B) | exit 0 | **PASS** |
| Cssr | - | pnpm build exit code | exit 0; .js 378893B (gz 119512B), .css 21084B (gz 3193B) | exit 0 | **PASS** |

## fonts

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | button | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| A | navbar | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| A | header80 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| A | layout620 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| A | testimonial37 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| A | cta25 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| A | page | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | button | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | navbar | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | header80 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | layout620 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | testimonial37 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | cta25 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| B | page | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | button | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | navbar | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | header80 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | layout620 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | testimonial37 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | cta25 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Bp | page | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | button | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | navbar | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | header80 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | layout620 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | testimonial37 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | cta25 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| C | page | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | button | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | navbar | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | header80 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | layout620 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | testimonial37 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | cta25 | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |
| Cssr | page | Source Sans 3 loaded; no external requests | loaded at all viewports | loaded, 0 external | **PASS** |

## semantic

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | button | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **REF** |
| A | navbar | SAC-expected roles present | `{"score":{"375":0.5,"768":0.5,"1440":0.5}}` | 100% at every viewport | **REF** |
| A | header80 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **REF** |
| A | layout620 | SAC-expected roles present | `{"score":{"375":0.8333,"768":0.8333,"1440":0.8333}}` | 100% at every viewport | **REF** |
| A | testimonial37 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **REF** |
| A | cta25 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **REF** |
| A | page | SAC-expected roles present | `{"score":{"375":0.6875,"768":0.6875,"1440":0.6875}}` | 100% at every viewport | **REF** |
| B | button | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | button | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| B | navbar | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | navbar | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| B | header80 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | header80 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| B | layout620 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | layout620 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| B | testimonial37 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | testimonial37 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| B | cta25 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | cta25 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| B | page | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| B | page | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | button | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | button | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | navbar | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | navbar | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | header80 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | header80 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | layout620 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | layout620 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | testimonial37 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | testimonial37 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | cta25 | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | cta25 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Bp | page | SAC-expected roles present | `{"score":{"375":0,"768":0,"1440":0}}` | 100% at every viewport | **FAIL** |
| Bp | page | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | button | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | button | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | navbar | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | navbar | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | header80 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | header80 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | layout620 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | layout620 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | testimonial37 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | testimonial37 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | cta25 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | cta25 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| C | page | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| C | page | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | button | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | button | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | navbar | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | navbar | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | header80 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | header80 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | layout620 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | layout620 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | testimonial37 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | testimonial37 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | cta25 | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | cta25 | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |
| Cssr | page | SAC-expected roles present | `{"score":{"375":1,"768":1,"1440":1}}` | 100% at every viewport | **PASS** |
| Cssr | page | role tree vs A (informational) _(info)_ | `{"treeEqualA":{"375":false,"768":false,"1440":false}}` | n/a (A has its own defects) | **INFO** |

## responsive

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| B | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[375,439,479,480,503,567,631,695,759,767,768,823,887,951,991,992,1015…` | all widths match A, no overflow | **FAIL** |
| B | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[375,439,479,480,503,567,631,695,759,767,768,823,887,951,991,992,1015…` | all widths match A, no overflow | **FAIL** |
| B | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[992,1015,1079,1143,1207,1271,1279,1280,1335,1399,1439],"columnMismat…` | all widths match A, no overflow | **FAIL** |
| B | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[375,439,479,480,503,567,631,695,759,767,768,823,887,951,991,992,1015…` | all widths match A, no overflow | **FAIL** |
| Bp | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[375,439,479,480,503,567,631,695,759,767,768,823,887,951,991,992,1015…` | all widths match A, no overflow | **FAIL** |
| Bp | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[375,439,479,480,503,567,631,695,759,767,768,823,887,951,991,992,1015…` | all widths match A, no overflow | **FAIL** |
| Bp | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[992,1015,1079,1143,1207,1271,1279,1280,1335,1399,1439],"columnMismat…` | all widths match A, no overflow | **FAIL** |
| Bp | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[375,439,479,480,503,567,631,695,759,767,768,823,887,951,991,992,1015…` | all widths match A, no overflow | **FAIL** |
| C | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| C | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| C | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| C | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| Cssr | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| Cssr | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| Cssr | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| Cssr | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":27,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |

## animation

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0,"transform":true},"768":{"maxDiff":0,"transform":true},"1440":{"maxDiff":0,"transform":true}}` | <=2 pct points | **REF** |
| A | header80 | sticky stage = viewport | `{"375":{"stickyFound":true,"offending":[]},"768":{"stickyFound":true,"offending":[]},"1440":{"stickyFound":true,"offending":[]}}` | height==innerHeight, top==0 | **REF** |
| A | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **REF** |
| B | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":85,"transform":false},"768":{"maxDiff":84.98,"transform":false},"1440":{"maxDiff":85.02,"transform":false}}` | <=2 pct points | **FAIL** |
| B | header80 | sticky stage = viewport | `{"375":{"stickyFound":false,"offending":[{"p":0,"found":false,"innerHeight":812},{"p":0.25,"found":false,"innerHeight":812},{"p":0.5,"found":false,"innerHeight…` | height==innerHeight, top==0 | **FAIL** |
| B | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |
| Bp | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":85,"transform":false},"768":{"maxDiff":84.98,"transform":false},"1440":{"maxDiff":85.02,"transform":false}}` | <=2 pct points | **FAIL** |
| Bp | header80 | sticky stage = viewport | `{"375":{"stickyFound":false,"offending":[{"p":0,"found":false,"innerHeight":812},{"p":0.25,"found":false,"innerHeight":812},{"p":0.5,"found":false,"innerHeight…` | height==innerHeight, top==0 | **FAIL** |
| Bp | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |
| C | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0.17,"transform":true},"768":{"maxDiff":0.2,"transform":true},"1440":{"maxDiff":0.2,"transform":true}}` | <=2 pct points | **PASS** |
| C | header80 | sticky stage = viewport | `{"375":{"stickyFound":true,"offending":[]},"768":{"stickyFound":true,"offending":[]},"1440":{"stickyFound":true,"offending":[]}}` | height==innerHeight, top==0 | **PASS** |
| C | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |
| Cssr | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0.17,"transform":true},"768":{"maxDiff":0.2,"transform":true},"1440":{"maxDiff":0.2,"transform":true}}` | <=2 pct points | **PASS** |
| Cssr | header80 | sticky stage = viewport | `{"375":{"stickyFound":true,"offending":[]},"768":{"stickyFound":true,"offending":[]},"1440":{"stickyFound":true,"offending":[]}}` | height==innerHeight, top==0 | **PASS** |
| Cssr | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |

## tokens

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | ALL | boundShare (informational) _(info)_ | `{"boundShare":0,"varDecls":0,"literalDecls":69,"otherVarDecls":0}` | n/a (C only) | **INFO** |
| A | button | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":19}` | n/a | **INFO** |
| A | navbar | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":27}` | n/a | **INFO** |
| A | header80 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":33}` | n/a | **INFO** |
| A | layout620 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":40}` | n/a | **INFO** |
| A | testimonial37 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":29}` | n/a | **INFO** |
| A | cta25 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":31}` | n/a | **INFO** |
| A | page | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":68}` | n/a | **INFO** |
| B | ALL | boundShare (informational) _(info)_ | `{"boundShare":0,"varDecls":0,"literalDecls":1318,"otherVarDecls":0}` | n/a (C only) | **INFO** |
| B | button | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":20}` | n/a | **INFO** |
| B | navbar | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":14}` | n/a | **INFO** |
| B | header80 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":31}` | n/a | **INFO** |
| B | layout620 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":77}` | n/a | **INFO** |
| B | testimonial37 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":70}` | n/a | **INFO** |
| B | cta25 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":33}` | n/a | **INFO** |
| B | page | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":225}` | n/a | **INFO** |
| Bp | ALL | boundShare (informational) _(info)_ | `{"boundShare":0,"varDecls":0,"literalDecls":1318,"otherVarDecls":0}` | n/a (C only) | **INFO** |
| Bp | button | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":20}` | n/a | **INFO** |
| Bp | navbar | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":14}` | n/a | **INFO** |
| Bp | header80 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":31}` | n/a | **INFO** |
| Bp | layout620 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":77}` | n/a | **INFO** |
| Bp | testimonial37 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":70}` | n/a | **INFO** |
| Bp | cta25 | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":33}` | n/a | **INFO** |
| Bp | page | boundShare @1440 _(info)_ | `{"share":0,"rawBoundShare":0,"var":0,"literal":225}` | n/a | **INFO** |
| C | ALL | boundShare over DSC-governed declarations = 100% | `{"boundShareGoverned":1,"rule":"r3","accounting":"stored (r3 measurement)","rawBoundShare_info":0.8246,"varDecls":94,"rawLiteralDecls":20,"unreadableValueDecls":0,"zeroLengthNeutral":5,"coverage":{"strict":0,"loose":14,"viaShorthand":1,"uncovered":0},"viaShorthandScope":{"strict":0,"loose":1},"excludedByManifest":15,"excludedStrict":0,"excludedLoose_fileNotIdentifiable":14,"uncoveredLiteralDecls":0,"uncoveredLiteral…` | 100% (D-6 accounting: zero lengths neutral; manifest coverage strict/loose/viaShorthand) | **PASS** |
| C | ALL | DSC token values (computed :root) have 0 mismatches | `{"tokenCount":37,"ok":37,"mismatches":[],"missing":[]}` | 0 mismatches, 0 missing | **PASS** |
| C | button | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8125,"var":13,"literal":3,"excludedByManifest":3}` | 100% | **PASS** |
| C | navbar | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.7,"var":14,"literal":6,"excludedByManifest":4}` | 100% | **PASS** |
| C | header80 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8621,"var":25,"literal":4,"excludedByManifest":4}` | 100% | **PASS** |
| C | layout620 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8636,"var":38,"literal":6,"excludedByManifest":6}` | 100% | **PASS** |
| C | testimonial37 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8205,"var":32,"literal":7,"excludedByManifest":4}` | 100% | **PASS** |
| C | cta25 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.92,"var":23,"literal":2,"excludedByManifest":2}` | 100% | **PASS** |
| C | page | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8304,"var":93,"literal":19,"excludedByManifest":14}` | 100% | **PASS** |
| Cssr | ALL | boundShare over DSC-governed declarations = 100% | `{"boundShareGoverned":1,"rule":"r3","accounting":"stored (r3 measurement)","rawBoundShare_info":0.8246,"varDecls":94,"rawLiteralDecls":20,"unreadableValueDecls":0,"zeroLengthNeutral":5,"coverage":{"strict":0,"loose":14,"viaShorthand":1,"uncovered":0},"viaShorthandScope":{"strict":0,"loose":1},"excludedByManifest":15,"excludedStrict":0,"excludedLoose_fileNotIdentifiable":14,"uncoveredLiteralDecls":0,"uncoveredLiteral…` | 100% (D-6 accounting: zero lengths neutral; manifest coverage strict/loose/viaShorthand) | **PASS** |
| Cssr | ALL | DSC token values (computed :root) have 0 mismatches | `{"tokenCount":37,"ok":37,"mismatches":[],"missing":[]}` | 0 mismatches, 0 missing | **PASS** |
| Cssr | button | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8125,"var":13,"literal":3,"excludedByManifest":3}` | 100% | **PASS** |
| Cssr | navbar | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.7,"var":14,"literal":6,"excludedByManifest":4}` | 100% | **PASS** |
| Cssr | header80 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8621,"var":25,"literal":4,"excludedByManifest":4}` | 100% | **PASS** |
| Cssr | layout620 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8636,"var":38,"literal":6,"excludedByManifest":6}` | 100% | **PASS** |
| Cssr | testimonial37 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8205,"var":32,"literal":7,"excludedByManifest":4}` | 100% | **PASS** |
| Cssr | cta25 | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.92,"var":23,"literal":2,"excludedByManifest":2}` | 100% | **PASS** |
| Cssr | page | governed boundShare @1440 | `{"share":1,"rawBoundShare":0.8304,"var":93,"literal":19,"excludedByManifest":14}` | 100% | **PASS** |

## accessibility

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | button | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| A | navbar | axe serious+critical | `{"375":1,"768":1,"1440":1}` | 0 | **FAIL** |
| A | header80 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| A | layout620 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| A | testimonial37 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| A | cta25 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| A | page | axe serious+critical | `{"375":1,"768":1,"1440":1}` | 0 | **FAIL** |
| B | button | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | navbar | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | header80 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | layout620 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | testimonial37 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | cta25 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | page | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| B | navbar | Tab order vs A (informational) _(info)_ | `{"375":{"arm":["body:"],"A":["a:","button:Button","button:","body:"]},"768":{"arm":["body:"],"A":["a:","button:Button","button:","body:"]},"1440":{"arm":["body…` | n/a | **INFO** |
| B | cta25 | Tab order vs A (informational) _(info)_ | `{"375":{"arm":["body:"],"A":["button:Button"]},"768":{"arm":["body:"],"A":["button:Button"]},"1440":{"arm":["body:"],"A":["button:Button"]}}` | n/a | **INFO** |
| Bp | button | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | navbar | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | header80 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | layout620 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | testimonial37 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | cta25 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | page | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Bp | navbar | Tab order vs A (informational) _(info)_ | `{"375":{"arm":["body:"],"A":["a:","button:Button","button:","body:"]},"768":{"arm":["body:"],"A":["a:","button:Button","button:","body:"]},"1440":{"arm":["body…` | n/a | **INFO** |
| Bp | cta25 | Tab order vs A (informational) _(info)_ | `{"375":{"arm":["body:"],"A":["button:Button"]},"768":{"arm":["body:"],"A":["button:Button"]},"1440":{"arm":["body:"],"A":["button:Button"]}}` | n/a | **INFO** |
| C | button | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | navbar | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | header80 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | layout620 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | testimonial37 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | cta25 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | page | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| C | navbar | Tab order vs A (informational) _(info)_ | `{"375":{"arm":["a:Synthetic logo","button:Button","button:","body:"],"A":["a:","button:Button","button:","body:"]},"768":{"arm":["a:Synthetic logo","button:But…` | n/a | **INFO** |
| C | cta25 | Tab order vs A (informational) _(info)_ | `{"375":"same as A","768":"same as A","1440":"same as A"}` | n/a | **INFO** |
| Cssr | button | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | navbar | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | header80 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | layout620 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | testimonial37 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | cta25 | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | page | axe serious+critical | `{"375":0,"768":0,"1440":0}` | 0 | **PASS** |
| Cssr | navbar | Tab order vs A (informational) _(info)_ | `{"375":{"arm":["a:Synthetic logo","button:Button","button:","body:"],"A":["a:","button:Button","button:","body:"]},"768":{"arm":["a:Synthetic logo","button:But…` | n/a | **INFO** |
| Cssr | cta25 | Tab order vs A (informational) _(info)_ | `{"375":"same as A","768":"same as A","1440":"same as A"}` | n/a | **INFO** |

## visual

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| B | button | pixel mismatch vs A _(stretch)_ | `{"375":"2.56% ssim 0.93366 dH 0","768":"1.00% ssim 0.96126 dH 0","1440":"0.60% ssim 0.97447 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| B | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"3.34% ssim 0.92662 dH 0","768":"1.19% ssim 0.97062 dH 0","1440":"0.37% ssim 0.99016 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| B | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"20.70% ssim 0.6993 dH 16","768":"3.34% ssim 0.88409 dH 16","1440":"2.97% ssim 0.89297 dH 16"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| B | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"6.40% ssim 0.57148 dH 202","768":"4.44% ssim 0.64708 dH 183","1440":"2.31% ssim 0.74632 dH 321"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| B | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"12.00% ssim 0.4784 dH 213","768":"5.89% ssim 0.54037 dH 50","1440":"4.57% ssim 0.66651 dH 223"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| B | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"6.25% ssim 0.71386 dH 0","768":"2.62% ssim 0.86202 dH 0","1440":"2.13% ssim 0.89543 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| B | page | pixel mismatch vs A _(stretch)_ | `{"375":"13.29% ssim 0.50261 dH 533","768":"4.81% ssim 0.73433 dH 521","1440":"3.95% ssim 0.74876 dH 119"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | button | pixel mismatch vs A _(stretch)_ | `{"375":"2.56% ssim 0.93366 dH 0","768":"1.00% ssim 0.96126 dH 0","1440":"0.60% ssim 0.97447 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"3.34% ssim 0.92662 dH 0","768":"1.19% ssim 0.97062 dH 0","1440":"0.37% ssim 0.99016 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"20.70% ssim 0.6993 dH 16","768":"3.34% ssim 0.88409 dH 16","1440":"2.97% ssim 0.89297 dH 16"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"6.40% ssim 0.57148 dH 202","768":"4.44% ssim 0.64708 dH 183","1440":"2.31% ssim 0.74632 dH 321"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"12.00% ssim 0.4784 dH 213","768":"5.89% ssim 0.54037 dH 50","1440":"4.57% ssim 0.66651 dH 223"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"6.25% ssim 0.71386 dH 0","768":"2.62% ssim 0.86202 dH 0","1440":"2.13% ssim 0.89543 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Bp | page | pixel mismatch vs A _(stretch)_ | `{"375":"13.29% ssim 0.50261 dH 533","768":"4.81% ssim 0.73433 dH 521","1440":"3.95% ssim 0.74876 dH 119"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | button | pixel mismatch vs A _(stretch)_ | `{"375":"0% ssim 0.9914 dH 0","768":"0% ssim 0.99956 dH 0","1440":"0% ssim 0.99984 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"1.00% ssim 0.97531 dH 0","768":"0.22% ssim 0.99193 dH 0","1440":"0.07% ssim 0.99832 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"1.35% ssim 0.98295 dH 0","768":"0.18% ssim 0.99625 dH 0","1440":"0.13% ssim 0.99704 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"0.21% ssim 0.97498 dH 17","768":"0.19% ssim 0.94687 dH 0","1440":"0.15% ssim 0.94483 dH 27"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"0.64% ssim 0.98297 dH 0","768":"0.58% ssim 0.97422 dH 0","1440":"0.45% ssim 0.97948 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"0% ssim 0.9914 dH 0","768":"0% ssim 0.99956 dH 0","1440":"0% ssim 0.99983 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | page | pixel mismatch vs A _(stretch)_ | `{"375":"4.51% ssim 0.81373 dH 17","768":"2.29% ssim 0.85083 dH 33","1440":"1.45% ssim 0.87313 dH 33"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | button | pixel mismatch vs A _(stretch)_ | `{"375":"0% ssim 0.9914 dH 0","768":"0% ssim 0.99956 dH 0","1440":"0% ssim 0.99984 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"1.00% ssim 0.97531 dH 0","768":"0.22% ssim 0.99193 dH 0","1440":"0.07% ssim 0.99832 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"1.35% ssim 0.98295 dH 0","768":"0.18% ssim 0.99625 dH 0","1440":"0.13% ssim 0.99704 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"0.21% ssim 0.97498 dH 17","768":"0.19% ssim 0.94687 dH 0","1440":"0.15% ssim 0.94483 dH 27"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"0.64% ssim 0.98297 dH 0","768":"0.58% ssim 0.97422 dH 0","1440":"0.45% ssim 0.97948 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"0% ssim 0.9914 dH 0","768":"0% ssim 0.99956 dH 0","1440":"0% ssim 0.99983 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | page | pixel mismatch vs A _(stretch)_ | `{"375":"4.51% ssim 0.81373 dH 17","768":"2.29% ssim 0.85083 dH 33","1440":"1.45% ssim 0.87313 dH 33"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |

## determinism

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| C | - | inputs selected for the check (D-7: by manifest dsc.revision) _(info)_ | FROZEN file FROZEN-r4.md; verify script generate:verify:r4; manifest dsc.revision sha256:6defaaa003c0d979526811cf6fa0a40f35b1f3ee9a726c0d77c27eb06ecc8918; basis: frozen - FROZEN-r4.md declares DSC revision == manifest dsc.revision; verify - generate:verify:r4 runs --dsc dsc/fs.ds.relume-default.r4.json whose revision == manifest dsc.revision | n/a | **INFO** |
| C | - | pnpm generate:verify:r4 exit code | exit 0 (generate:verify:r4) | exit 0 | **PASS** |
| C | - | every FROZEN-r4.md entry (root-relative) matches disk | `{"frozenFile":"FROZEN-r4.md","verifyScript":"generate:verify:r4","manifestRevision":"sha256:6defaaa003c0d979526811cf6fa0a40f35b1f3ee9a726c0d77c27eb06ecc8918","selectionBasis":{"frozen":"FROZEN-r4.md declares DSC revision == manifest dsc.revision","verifyScript":"generate:verify:r4 runs --dsc dsc/fs.ds.relume-default.r4.json whose revision == manifest dsc.revision"},"files":20,"unlisted":[],"frozenEntries":40,"matche…` | all equal | **PASS** |
| C | - | bundle reproducibility (two builds, reported separately) _(info)_ | `{"exitCodes":[0,0],"fileCounts":[11,11],"differingFiles":[]}` | identical dist hashes (info) | **PASS** |

## licence

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| C | - | import-line matches (excluded from the check, reported separately) _(info)_ | `{"importLineMatchCount":1,"locations":["app/src/generated/Hero.tsx:2 0549bfa6255a"]}` | n/a | **INFO** |
| C | - | matching non-import lines >= 40 chars vs Arm A source (supplementary, not proof) | `{"matchCount":0,"uniqueHashes":1,"scannedLines":1611,"referenceLines":208,"locations":[]}` | 0 | **PASS** |
| C | - | forbidden strings under experiment dir | `{"hitCount":5,"filesScanned":1549,"hits":[{"file":"inputs/dsc/DSC-R3-NOTES.md","patternIndex":1,"classification":"other","occurrences":1,"reason":"not a proven…` | 0 hits | **FAIL** |

_Full per-viewport/per-sample values are in summary.json and the per-arm JSON files._
