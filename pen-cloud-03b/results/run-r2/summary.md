# PEN-CLOUD-03-B acceptance summary

Criteria: **r2** (semantic: roles only; governed token share; section padding; root-relative FROZEN; import lines excluded)

Run: `2026-10-17T18-28-37-867Z`  ·  generated 2026-10-17T18:35:40.821Z  ·  reference arm A present

## Verdict (required checks)

| Arm | PASS | FAIL | MISSING | stretch PASS/FAIL |
|---|---|---|---|---|
| A | reference | | | |
| B | 16 | 13 | 0 | 0/7 |
| Bp | 16 | 13 | 0 | 0/7 |
| C | 29 | 13 | 0 | 2/5 |
| Cssr | 27 | 11 | 0 | 2/5 |

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
| responsive | REF | FAIL (4/4) | FAIL (4/4) | FAIL (3/4) | FAIL (3/4) |
| animation | REF | FAIL (2/3) | FAIL (2/3) | PASS (3) | PASS (3) |
| tokens | REF | info | info | FAIL (8/9) | FAIL (8/9) |
| accessibility | REF | PASS (7) | PASS (7) | PASS (7) | PASS (7) |
| visual |  | FAIL (7/7) | FAIL (7/7) | FAIL (5/7) | FAIL (5/7) |
| determinism |  |  |  | FAIL (2/3) |  |
| licence |  |  |  | PASS (2) |  |

## Thresholds

- **reference**: A (Relume React control) at the same route/viewport
- **semantic**: score = 100% of SAC-expected roles present at every viewport (role tree vs A is informational: the control has its own defects)
- **responsive**: column counts and padding-top of the nearest <section> (or data-fs-id section root) containing the route heading equal to A at every sweep width (375..1440, 64px steps) and no horizontal overflow
- **animation**: translateY within 2 percentage points of column height of A at every probe sample; sticky stage = viewport (height == innerHeight, top == 0); reduced motion gives identity transform
- **tokenIntegrity**: C only: boundShare over DSC-governed declarations = 100% (literals listed in generated-manifest.json ungoverned[] are excluded and counted; raw share is informational) and 0 DSC token mismatches/missing
- **visual**: STRETCH: pixel mismatch <= 1% (pixelmatch threshold 0.1, includeAA false); SSIM and height difference reported
- **accessibility**: 0 serious or critical axe violations per route/viewport
- **determinism**: C only: pnpm generate:verify exit 0; every FROZEN.md entry (paths relative to the arm-c root: app/src/generated/**, generator/**) found on disk with an equal SHA-256; (bundle reproducibility reported separately)
- **licence**: C only: 0 matching lines >= 40 chars against Arm A reference source excluding pure import/export-from lines (reported separately); 0 forbidden-string hits (supplementary, not proof)
- **build**: pnpm build exit code 0
- **fonts**: Source Sans 3 face loaded (document.fonts) on every page

## build

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | - | pnpm build exit code | exit 0; .css 19482B (gz 4206B), .js 409868B (gz 130715B) | exit 0 | **PASS** |
| B | - | pnpm build exit code | exit 0; no dist found | exit 0 | **PASS** |
| Bp | - | pnpm build exit code | exit 0; no dist found | exit 0 | **PASS** |
| C | - | pnpm build exit code | exit 0; .js 378893B (gz 119512B), .css 19752B (gz 3027B) | exit 0 | **PASS** |
| Cssr | - | pnpm build exit code | exit 0; .js 378893B (gz 119512B), .css 19752B (gz 3027B) | exit 0 | **PASS** |

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
| A | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| B | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,133…` | all widths match A, no overflow | **FAIL** |
| B | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,133…` | all widths match A, no overflow | **FAIL** |
| B | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[1079,1143,1207,1271,1335,1399],"columnMismatches":[],"paddingMismatc…` | all widths match A, no overflow | **FAIL** |
| B | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,133…` | all widths match A, no overflow | **FAIL** |
| Bp | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,133…` | all widths match A, no overflow | **FAIL** |
| Bp | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,133…` | all widths match A, no overflow | **FAIL** |
| Bp | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[1079,1143,1207,1271,1335,1399],"columnMismatches":[],"paddingMismatc…` | all widths match A, no overflow | **FAIL** |
| Bp | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,133…` | all widths match A, no overflow | **FAIL** |
| C | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[{"w":1015,"section":"la…` | all widths match A, no overflow | **FAIL** |
| C | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm"…` | all widths match A, no overflow | **FAIL** |
| C | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| C | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm"…` | all widths match A, no overflow | **FAIL** |
| Cssr | layout620 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[{"w":1015,"section":"la…` | all widths match A, no overflow | **FAIL** |
| Cssr | testimonial37 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm"…` | all widths match A, no overflow | **FAIL** |
| Cssr | header80 | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| Cssr | page | columns/padding == A, no overflow | `{"padding":"nearest section containing the route heading","widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm"…` | all widths match A, no overflow | **FAIL** |

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
| C | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0.18,"transform":true},"768":{"maxDiff":0.18,"transform":true},"1440":{"maxDiff":0.23,"transform":true}}` | <=2 pct points | **PASS** |
| C | header80 | sticky stage = viewport | `{"375":{"stickyFound":true,"offending":[]},"768":{"stickyFound":true,"offending":[]},"1440":{"stickyFound":true,"offending":[]}}` | height==innerHeight, top==0 | **PASS** |
| C | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |
| Cssr | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0.18,"transform":true},"768":{"maxDiff":0.17,"transform":true},"1440":{"maxDiff":0.23,"transform":true}}` | <=2 pct points | **PASS** |
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
| C | ALL | boundShare over DSC-governed declarations = 100% | `{"boundShareGoverned":0.9485,"rawBoundShare_info":0.8214,"varDecls":92,"rawLiteralDecls":20,"unreadableValueDecls":0,"excludedByManifest":15,"excludedStrict":0…` | 100% (manifest-listed ungoverned literals excluded) | **FAIL** |
| C | ALL | DSC token values (computed :root) have 0 mismatches | `{"tokenCount":32,"ok":32,"mismatches":[],"missing":[]}` | 0 mismatches, 0 missing | **PASS** |
| C | button | governed boundShare @1440 | `{"share":0.9286,"rawBoundShare":0.8125,"var":13,"literal":3,"excludedByManifest":2}` | 100% | **FAIL** |
| C | navbar | governed boundShare @1440 | `{"share":0.8235,"rawBoundShare":0.7,"var":14,"literal":6,"excludedByManifest":3}` | 100% | **FAIL** |
| C | header80 | governed boundShare @1440 | `{"share":0.9583,"rawBoundShare":0.8214,"var":23,"literal":5,"excludedByManifest":4}` | 100% | **FAIL** |
| C | layout620 | governed boundShare @1440 | `{"share":0.9744,"rawBoundShare":0.8636,"var":38,"literal":6,"excludedByManifest":5}` | 100% | **FAIL** |
| C | testimonial37 | governed boundShare @1440 | `{"share":0.9412,"rawBoundShare":0.8421,"var":32,"literal":6,"excludedByManifest":4}` | 100% | **FAIL** |
| C | cta25 | governed boundShare @1440 | `{"share":0.9583,"rawBoundShare":0.92,"var":23,"literal":2,"excludedByManifest":1}` | 100% | **FAIL** |
| C | page | governed boundShare @1440 | `{"share":0.9479,"rawBoundShare":0.8273,"var":91,"literal":19,"excludedByManifest":14}` | 100% | **FAIL** |
| Cssr | ALL | boundShare over DSC-governed declarations = 100% | `{"boundShareGoverned":0.9485,"rawBoundShare_info":0.8214,"varDecls":92,"rawLiteralDecls":20,"unreadableValueDecls":0,"excludedByManifest":15,"excludedStrict":0…` | 100% (manifest-listed ungoverned literals excluded) | **FAIL** |
| Cssr | ALL | DSC token values (computed :root) have 0 mismatches | `{"tokenCount":32,"ok":32,"mismatches":[],"missing":[]}` | 0 mismatches, 0 missing | **PASS** |
| Cssr | button | governed boundShare @1440 | `{"share":0.9286,"rawBoundShare":0.8125,"var":13,"literal":3,"excludedByManifest":2}` | 100% | **FAIL** |
| Cssr | navbar | governed boundShare @1440 | `{"share":0.8235,"rawBoundShare":0.7,"var":14,"literal":6,"excludedByManifest":3}` | 100% | **FAIL** |
| Cssr | header80 | governed boundShare @1440 | `{"share":0.9583,"rawBoundShare":0.8214,"var":23,"literal":5,"excludedByManifest":4}` | 100% | **FAIL** |
| Cssr | layout620 | governed boundShare @1440 | `{"share":0.9744,"rawBoundShare":0.8636,"var":38,"literal":6,"excludedByManifest":5}` | 100% | **FAIL** |
| Cssr | testimonial37 | governed boundShare @1440 | `{"share":0.9412,"rawBoundShare":0.8421,"var":32,"literal":6,"excludedByManifest":4}` | 100% | **FAIL** |
| Cssr | cta25 | governed boundShare @1440 | `{"share":0.9583,"rawBoundShare":0.92,"var":23,"literal":2,"excludedByManifest":1}` | 100% | **FAIL** |
| Cssr | page | governed boundShare @1440 | `{"share":0.9479,"rawBoundShare":0.8273,"var":91,"literal":19,"excludedByManifest":14}` | 100% | **FAIL** |

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
| C | button | pixel mismatch vs A _(stretch)_ | `{"375":"0.17% ssim 0.9824 dH 0","768":"0.07% ssim 0.99461 dH 0","1440":"0.04% ssim 0.99938 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"0.93% ssim 0.97575 dH 0","768":"0.20% ssim 0.99266 dH 0","1440":"0.05% ssim 0.99885 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| C | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"10.72% ssim 0.73014 dH 0","768":"3.81% ssim 0.89649 dH 0","1440":"3.55% ssim 0.90249 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"0.21% ssim 0.97514 dH 15","768":"4.56% ssim 0.58861 dH 0","1440":"2.64% ssim 0.6717 dH 82"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"5.09% ssim 0.73612 dH -40","768":"7.64% ssim 0.52623 dH -214","1440":"0.45% ssim 0.97948 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"0.17% ssim 0.9824 dH 0","768":"1.34% ssim 0.93325 dH 0","1440":"1.69% ssim 0.90871 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | page | pixel mismatch vs A _(stretch)_ | `{"375":"7.15% ssim 0.74923 dH -27","768":"5.22% ssim 0.72816 dH -127","1440":"3.96% ssim 0.75293 dH 144"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | button | pixel mismatch vs A _(stretch)_ | `{"375":"0.17% ssim 0.9824 dH 0","768":"0.07% ssim 0.99461 dH 0","1440":"0.04% ssim 0.99938 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"0.93% ssim 0.97575 dH 0","768":"0.20% ssim 0.99266 dH 0","1440":"0.05% ssim 0.99885 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"10.72% ssim 0.73014 dH 0","768":"3.81% ssim 0.89649 dH 0","1440":"3.55% ssim 0.90249 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"0.21% ssim 0.97514 dH 15","768":"4.56% ssim 0.58861 dH 0","1440":"2.64% ssim 0.6717 dH 82"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"5.09% ssim 0.73612 dH -40","768":"7.64% ssim 0.52623 dH -214","1440":"0.45% ssim 0.97948 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"0.17% ssim 0.9824 dH 0","768":"1.34% ssim 0.93325 dH 0","1440":"1.69% ssim 0.90871 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | page | pixel mismatch vs A _(stretch)_ | `{"375":"7.15% ssim 0.74923 dH -27","768":"5.22% ssim 0.72816 dH -127","1440":"3.96% ssim 0.75293 dH 144"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |

## determinism

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| C | - | pnpm generate:verify exit code | exit 1 | exit 0 | **FAIL** |
| C | - | every FROZEN.md entry (root-relative) matches disk | `{"files":20,"unlisted":[],"frozenEntries":41,"matched":36,"mismatched":[{"file":"app/src/generated/generated-manifest.json","actual":"ca252861b975e6b9615919124…` | all equal | **FAIL** |
| C | - | bundle reproducibility (two builds, reported separately) _(info)_ | `{"exitCodes":[0,0],"fileCounts":[11,11],"differingFiles":[]}` | identical dist hashes (info) | **PASS** |

## licence

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| C | - | import-line matches (excluded from the check, reported separately) _(info)_ | `{"importLineMatchCount":1,"locations":["app/src/generated/Hero.tsx:2 0549bfa6255a"]}` | n/a | **INFO** |
| C | - | matching non-import lines >= 40 chars vs Arm A source (supplementary, not proof) | `{"matchCount":0,"uniqueHashes":1,"scannedLines":1445,"referenceLines":208,"locations":[]}` | 0 | **PASS** |
| C | - | forbidden strings under experiment dir | `{"hitCount":0,"filesScanned":980,"hits":[]}` | 0 hits | **PASS** |

_Full per-viewport/per-sample values are in summary.json and the per-arm JSON files._
