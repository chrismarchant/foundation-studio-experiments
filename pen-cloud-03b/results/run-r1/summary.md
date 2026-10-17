# PEN-CLOUD-03-B acceptance summary

Run: `2026-10-17T18-11-18-266Z`  ·  generated 2026-10-17T18:18:25.543Z  ·  reference arm A present

## Verdict (required checks)

| Arm | PASS | FAIL | MISSING | stretch PASS/FAIL |
|---|---|---|---|---|
| A | reference | | | |
| B | 16 | 13 | 0 | 0/7 |
| Bp | 16 | 13 | 0 | 0/7 |
| C | 22 | 20 | 0 | 2/5 |
| Cssr | 20 | 18 | 0 | 2/5 |

## Dimension matrix

| Dimension | A | B | Bp | C | Cssr |
|---|---|---|---|---|---|
| build | REF | PASS (1) | PASS (1) | PASS (1) | PASS (1) |
| fonts | REF | PASS (7) | PASS (7) | PASS (7) | PASS (7) |
| semantic | REF | FAIL (7/7) | FAIL (7/7) | FAIL (7/7) | FAIL (7/7) |
| responsive | REF | FAIL (4/4) | FAIL (4/4) | FAIL (3/4) | FAIL (3/4) |
| animation | REF | FAIL (2/3) | FAIL (2/3) | PASS (3) | PASS (3) |
| tokens | REF | info | info | FAIL (8/9) | FAIL (8/9) |
| accessibility | REF | PASS (7) | PASS (7) | PASS (7) | PASS (7) |
| visual |  | FAIL (7/7) | FAIL (7/7) | FAIL (5/7) | FAIL (5/7) |
| determinism |  |  |  | FAIL (1/3) |  |
| licence |  |  |  | FAIL (1/2) |  |

## Thresholds

- **reference**: A (Relume React control) at the same route/viewport
- **semantic**: score = 100% of SAC-expected roles present at every viewport AND role tree (tag, role, level, text) equal to A
- **responsive**: column counts and section padding-top equal to A at every sweep width (375..1440, 64px steps) and no horizontal overflow
- **animation**: translateY within 2 percentage points of column height of A at every probe sample; sticky stage = viewport (height == innerHeight, top == 0); reduced motion gives identity transform
- **tokenIntegrity**: C only: boundShare = 100% (every governed declaration uses var(--fs-*)) and 0 DSC token mismatches/missing
- **visual**: STRETCH: pixel mismatch <= 1% (pixelmatch threshold 0.1, includeAA false); SSIM and height difference reported
- **accessibility**: 0 serious or critical axe violations per route/viewport
- **determinism**: C only: pnpm generate:verify exit 0; generated files hash-equal to FROZEN.md; (bundle reproducibility reported separately)
- **licence**: C only: 0 matching lines >= 40 chars against Arm A reference source (supplementary, not proof); 0 forbidden-string hits
- **build**: pnpm build exit code 0
- **fonts**: Source Sans 3 face loaded (document.fonts) on every page

## build

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | - | pnpm build exit code | exit 0; .css 19482B (gz 4206B), .js 409868B (gz 130715B) | exit 0 | **PASS** |
| B | - | pnpm build exit code | exit 0; no dist found | exit 0 | **PASS** |
| Bp | - | pnpm build exit code | exit 0; no dist found | exit 0 | **PASS** |
| C | - | pnpm build exit code | exit 0; .css 19896B (gz 3049B), .js 378893B (gz 119512B) | exit 0 | **PASS** |
| Cssr | - | pnpm build exit code | exit 0; .css 19896B (gz 3049B), .js 378893B (gz 119512B) | exit 0 | **PASS** |

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
| A | button | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| A | navbar | expected roles + role tree vs A | `{"score":{"375":0.5,"768":0.5,"1440":0.5},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| A | header80 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| A | layout620 | expected roles + role tree vs A | `{"score":{"375":0.8333,"768":0.8333,"1440":0.8333},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| A | testimonial37 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| A | cta25 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| A | page | expected roles + role tree vs A | `{"score":{"375":0.6875,"768":0.6875,"1440":0.6875},"treeEqualA":null}` | 100% roles, tree == A | **REF** |
| B | button | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| B | navbar | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| B | header80 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| B | layout620 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| B | testimonial37 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| B | cta25 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| B | page | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | button | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | navbar | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | header80 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | layout620 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | testimonial37 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | cta25 | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Bp | page | expected roles + role tree vs A | `{"score":{"375":0,"768":0,"1440":0},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | button | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | navbar | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | header80 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | layout620 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | testimonial37 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | cta25 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| C | page | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | button | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | navbar | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | header80 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | layout620 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | testimonial37 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | cta25 | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |
| Cssr | page | expected roles + role tree vs A | `{"score":{"375":1,"768":1,"1440":1},"treeEqualA":{"375":false,"768":false,"1440":false}}` | 100% roles, tree == A | **FAIL** |

## responsive

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | layout620 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | testimonial37 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | header80 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| A | page | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **REF** |
| B | layout620 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,1335,1399,1440],"columnMismatches":[{"w":375,"section":"layo…` | all widths match A, no overflow | **FAIL** |
| B | testimonial37 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,1335,1399,1440],"columnMismatches":[{"w":503,"section":"test…` | all widths match A, no overflow | **FAIL** |
| B | header80 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[1079,1143,1207,1271,1335,1399],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **FAIL** |
| B | page | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,1335,1399],"columnMismatches":[{"w":375,"section":"layout620…` | all widths match A, no overflow | **FAIL** |
| Bp | layout620 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,1335,1399,1440],"columnMismatches":[{"w":375,"section":"layo…` | all widths match A, no overflow | **FAIL** |
| Bp | testimonial37 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,1335,1399,1440],"columnMismatches":[{"w":503,"section":"test…` | all widths match A, no overflow | **FAIL** |
| Bp | header80 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[1079,1143,1207,1271,1335,1399],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **FAIL** |
| Bp | page | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[375,439,503,567,631,695,759,823,887,951,1015,1079,1143,1207,1271,1335,1399],"columnMismatches":[{"w":375,"section":"layout620…` | all widths match A, no overflow | **FAIL** |
| C | layout620 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[{"w":375,"section":"subject","A":"0px","arm":"64px"},{"w":375,"section":"layout6…` | all widths match A, no overflow | **FAIL** |
| C | testimonial37 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm":1},{"w":567,"section":"testimonial37","A":2,"arm":1},{"w…` | all widths match A, no overflow | **FAIL** |
| C | header80 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| C | page | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm":1},{"w":567,"section":"testimonial37","A":2,"arm":1},{"w…` | all widths match A, no overflow | **FAIL** |
| Cssr | layout620 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[{"w":375,"section":"subject","A":"0px","arm":"64px"},{"w":375,"section":"layout6…` | all widths match A, no overflow | **FAIL** |
| Cssr | testimonial37 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm":1},{"w":567,"section":"testimonial37","A":2,"arm":1},{"w…` | all widths match A, no overflow | **FAIL** |
| Cssr | header80 | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[],"paddingMismatches":[],"errors":[]}` | all widths match A, no overflow | **PASS** |
| Cssr | page | columns/padding == A, no overflow | `{"widthsChecked":18,"overflowAt":[],"columnMismatches":[{"w":503,"section":"testimonial37","A":2,"arm":1},{"w":567,"section":"testimonial37","A":2,"arm":1},{"w…` | all widths match A, no overflow | **FAIL** |

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
| C | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0.18,"transform":true},"768":{"maxDiff":0.18,"transform":true},"1440":{"maxDiff":0.22,"transform":true}}` | <=2 pct points | **PASS** |
| C | header80 | sticky stage = viewport | `{"375":{"stickyFound":true,"offending":[]},"768":{"stickyFound":true,"offending":[]},"1440":{"stickyFound":true,"offending":[]}}` | height==innerHeight, top==0 | **PASS** |
| C | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |
| Cssr | header80 | translateY vs A (<=2% of column height) | `{"375":{"maxDiff":0.18,"transform":true},"768":{"maxDiff":0.18,"transform":true},"1440":{"maxDiff":0.23,"transform":true}}` | <=2 pct points | **PASS** |
| Cssr | header80 | sticky stage = viewport | `{"375":{"stickyFound":true,"offending":[]},"768":{"stickyFound":true,"offending":[]},"1440":{"stickyFound":true,"offending":[]}}` | height==innerHeight, top==0 | **PASS** |
| Cssr | header80 | reduced motion honoured | `{"375":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"768":{"identity":true,"tyLeft":0,"tyRight":0,"matchMedia":true},"1440":{"identity":true,"tyL…` | identity transform | **PASS** |

## tokens

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| A | ALL | boundShare (informational) _(info)_ | `{"boundShare":0,"varDecls":0,"literalDecls":69,"otherVarDecls":0}` | n/a (C only) | **INFO** |
| A | button | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":19}` | n/a | **INFO** |
| A | navbar | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":27}` | n/a | **INFO** |
| A | header80 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":33}` | n/a | **INFO** |
| A | layout620 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":40}` | n/a | **INFO** |
| A | testimonial37 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":29}` | n/a | **INFO** |
| A | cta25 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":31}` | n/a | **INFO** |
| A | page | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":68}` | n/a | **INFO** |
| B | ALL | boundShare (informational) _(info)_ | `{"boundShare":0,"varDecls":0,"literalDecls":1318,"otherVarDecls":0}` | n/a (C only) | **INFO** |
| B | button | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":20}` | n/a | **INFO** |
| B | navbar | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":14}` | n/a | **INFO** |
| B | header80 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":31}` | n/a | **INFO** |
| B | layout620 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":77}` | n/a | **INFO** |
| B | testimonial37 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":70}` | n/a | **INFO** |
| B | cta25 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":33}` | n/a | **INFO** |
| B | page | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":225}` | n/a | **INFO** |
| Bp | ALL | boundShare (informational) _(info)_ | `{"boundShare":0,"varDecls":0,"literalDecls":1318,"otherVarDecls":0}` | n/a (C only) | **INFO** |
| Bp | button | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":20}` | n/a | **INFO** |
| Bp | navbar | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":14}` | n/a | **INFO** |
| Bp | header80 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":31}` | n/a | **INFO** |
| Bp | layout620 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":77}` | n/a | **INFO** |
| Bp | testimonial37 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":70}` | n/a | **INFO** |
| Bp | cta25 | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":33}` | n/a | **INFO** |
| Bp | page | boundShare @1440 _(info)_ | `{"boundShare":0,"var":0,"literal":225}` | n/a | **INFO** |
| C | ALL | boundShare = 100% | `{"boundShare":0.8214,"boundShareStrict":0.8214,"varDecls":92,"literalDecls":20,"otherVarDecls":0,"mixedVarDecls":0,"literalSamples":[{"selector":".fs-button","…` | 100% var(--fs-*) | **FAIL** |
| C | ALL | DSC token values (computed :root) have 0 mismatches | `{"tokenCount":32,"ok":32,"mismatches":[],"missing":[]}` | 0 mismatches, 0 missing | **PASS** |
| C | button | boundShare @1440 | `{"boundShare":0.8125,"var":13,"literal":3}` | 100% | **FAIL** |
| C | navbar | boundShare @1440 | `{"boundShare":0.7,"var":14,"literal":6}` | 100% | **FAIL** |
| C | header80 | boundShare @1440 | `{"boundShare":0.8214,"var":23,"literal":5}` | 100% | **FAIL** |
| C | layout620 | boundShare @1440 | `{"boundShare":0.8636,"var":38,"literal":6}` | 100% | **FAIL** |
| C | testimonial37 | boundShare @1440 | `{"boundShare":0.8421,"var":32,"literal":6}` | 100% | **FAIL** |
| C | cta25 | boundShare @1440 | `{"boundShare":0.92,"var":23,"literal":2}` | 100% | **FAIL** |
| C | page | boundShare @1440 | `{"boundShare":0.8273,"var":91,"literal":19}` | 100% | **FAIL** |
| Cssr | ALL | boundShare = 100% | `{"boundShare":0.8214,"boundShareStrict":0.8214,"varDecls":92,"literalDecls":20,"otherVarDecls":0,"mixedVarDecls":0,"literalSamples":[{"selector":".fs-button","…` | 100% var(--fs-*) | **FAIL** |
| Cssr | ALL | DSC token values (computed :root) have 0 mismatches | `{"tokenCount":32,"ok":32,"mismatches":[],"missing":[]}` | 0 mismatches, 0 missing | **PASS** |
| Cssr | button | boundShare @1440 | `{"boundShare":0.8125,"var":13,"literal":3}` | 100% | **FAIL** |
| Cssr | navbar | boundShare @1440 | `{"boundShare":0.7,"var":14,"literal":6}` | 100% | **FAIL** |
| Cssr | header80 | boundShare @1440 | `{"boundShare":0.8214,"var":23,"literal":5}` | 100% | **FAIL** |
| Cssr | layout620 | boundShare @1440 | `{"boundShare":0.8636,"var":38,"literal":6}` | 100% | **FAIL** |
| Cssr | testimonial37 | boundShare @1440 | `{"boundShare":0.8421,"var":32,"literal":6}` | 100% | **FAIL** |
| Cssr | cta25 | boundShare @1440 | `{"boundShare":0.92,"var":23,"literal":2}` | 100% | **FAIL** |
| Cssr | page | boundShare @1440 | `{"boundShare":0.8273,"var":91,"literal":19}` | 100% | **FAIL** |

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
| C | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"11.51% ssim 0.72831 dH 0","768":"3.19% ssim 0.91742 dH 0","1440":"3.55% ssim 0.90249 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"8.40% ssim 0.60742 dH -117","768":"4.48% ssim 0.62062 dH 0","1440":"2.64% ssim 0.6717 dH 82"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"11.34% ssim 0.57332 dH -69","768":"8.43% ssim 0.45162 dH -224","1440":"0.45% ssim 0.97948 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"6.84% ssim 0.78627 dH 0","768":"1.83% ssim 0.88811 dH 0","1440":"1.69% ssim 0.90871 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| C | page | pixel mismatch vs A _(stretch)_ | `{"375":"11.22% ssim 0.62331 dH -274","768":"4.97% ssim 0.73727 dH -243","1440":"3.96% ssim 0.75293 dH 144"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | button | pixel mismatch vs A _(stretch)_ | `{"375":"0.17% ssim 0.9824 dH 0","768":"0.07% ssim 0.99461 dH 0","1440":"0.04% ssim 0.99938 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | navbar | pixel mismatch vs A _(stretch)_ | `{"375":"0.93% ssim 0.97575 dH 0","768":"0.20% ssim 0.99266 dH 0","1440":"0.05% ssim 0.99885 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **PASS** |
| Cssr | header80 | pixel mismatch vs A _(stretch)_ | `{"375":"11.51% ssim 0.72831 dH 0","768":"3.19% ssim 0.91742 dH 0","1440":"3.55% ssim 0.90249 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | layout620 | pixel mismatch vs A _(stretch)_ | `{"375":"8.40% ssim 0.60742 dH -117","768":"4.48% ssim 0.62062 dH 0","1440":"2.64% ssim 0.6717 dH 82"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | testimonial37 | pixel mismatch vs A _(stretch)_ | `{"375":"11.34% ssim 0.57332 dH -69","768":"8.43% ssim 0.45162 dH -224","1440":"0.45% ssim 0.97948 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | cta25 | pixel mismatch vs A _(stretch)_ | `{"375":"6.84% ssim 0.78627 dH 0","768":"1.83% ssim 0.88811 dH 0","1440":"1.69% ssim 0.90871 dH 0"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |
| Cssr | page | pixel mismatch vs A _(stretch)_ | `{"375":"11.22% ssim 0.62331 dH -274","768":"4.97% ssim 0.73727 dH -243","1440":"3.96% ssim 0.75293 dH 144"}` | <=1% (stretch); SSIM + height diff reported | **FAIL** |

## determinism

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| C | - | pnpm generate:verify exit code | exit 0 | exit 0 | **PASS** |
| C | - | generated/ hashes == FROZEN.md | `{"files":20,"frozenEntries":41,"matched":20,"mismatched":[],"notInFrozen":[],"frozenNotOnDisk":["app/src/generated/generated-manifest.json","generator/emit/but…` | all equal | **FAIL** |
| C | - | bundle reproducibility (two builds, reported separately) _(info)_ | `{"exitCodes":[0,0],"fileCounts":[11,11],"differingFiles":[]}` | identical dist hashes (info) | **PASS** |

## licence

| Arm | Route | Check | Measured | Threshold | Status |
|---|---|---|---|---|---|
| C | - | matching lines >= 40 chars vs Arm A source (supplementary, not proof) | `{"matchCount":1,"uniqueHashes":1,"scannedLines":1462,"referenceLines":208,"locations":["app/src/generated/Hero.tsx:2 0549bfa6255a"]}` | 0 | **FAIL** |
| C | - | forbidden strings under experiment dir | `{"hitCount":0,"filesScanned":737,"hits":[]}` | 0 hits | **PASS** |

_Full per-viewport/per-sample values are in summary.json and the per-arm JSON files._
