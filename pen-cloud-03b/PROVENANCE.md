# PEN-CLOUD-03-B — Provenance

| Input | Location | Source | Hash / id |
|---|---|---|---|
| DSC r1 | `inputs/dsc/fs.ds.relume-default.r1.json` | built by `scripts/build-dsc-r1.py` from the Penpot serialisation and the PEN-CLOUD-02/03 mappings; byte-identical on rerun | `revision` field inside the file |
| Penpot serialisation | `inputs/penpot/serialisation.json` | official Penpot MCP `execute_code` read of `FS_Test001` (`cd444aaf-0d8c-801b-8008-cde3b8b4d8bc`): token sets, components, Landing boards, bindings, plugin data | 2026-10-17 |
| Penpot structure readback | `inputs/penpot/structure.json` | official MCP tree walk of the three Landing boards and Hero A (geometry, flex, text, fills, tokens, component refs, identity + semantic plugin data) | `capturedAt` inside the file |
| SAC annotations | `inputs/sac/landing-sac.json` (+ `landing-annotation-log.json`) | `foundation.semantic` written through the official MCP on the Landing sections (OD-38 rules) and read back | 2026-10-17 |
| DTCC baseline | `inputs/dtcc/baseline-report.json` | API lint of the three boards; persisted on each board as `foundation.lint` | 2026-10-17 |
| Penpot code output (Arm B input) | `arm-b/penpot-output.json` | `penpot.generateMarkup` / `generateStyle` / `generateFontFaces` per section per board + the two button mains | `capturedAt` inside the file |
| Fonts | `inputs/fonts/` | Source Sans 3 (OFL 1.1) subsets from Google Fonts, pinned by hash in `MANIFEST.json` (OD-40) | see manifest |
| Synthetic copy | `inputs/copy.json` | authored for PEN-CLOUD-02; shared by all arms | — |
| Arm A (Relume React control) | **outside this repository**, untracked, `/home/user/pc03b-arm-a/` in the agent environment | Relume Library MCP `get_component` for `navbar17_component`, `section_header80`, `section_layout620`, `section_testimonial37`, `section_cta25` with primitives, retrieved 2026-10-17 | section/primitive file hashes recorded in `results/arm-a-source-hashes.txt` (hashes only; no source) |

Rules in force: OD-25/OD-37 (no Relume source enters any repository), OD-41 (Penpot structure is a design observation, not canonical intent), the Arm C isolation rule (Arm C's agent never sees Arm A or comparison results before C is frozen).

## Incidents

- 2026-10-17, harness agent: while testing the harness's failure path it ran a normal-mode invocation against the real `arm-b` and `arm-c` directories (built them, started/stopped their servers, ran Arm C's `generate:verify`, rebuilt `arm-c/app/dist`, and ran the licence hash step, which reads Arm A line hashes). The harness agent is not Arm C's implementation agent and Arm C had already been frozen (`FROZEN.md`, commit `9498478`), so the Arm C isolation rule was not breached. The output directory was deleted unread. Tracked files of arms B and C are unchanged against their freeze commits (`git diff cdf447b` / `git diff 9498478`, verified before run r1), and all 40 frozen Arm C files match `FROZEN.md`.
