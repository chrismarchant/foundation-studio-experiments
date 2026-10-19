# PEN-CLOUD-03-B — Result (experiment-repository copy)

The authoritative records are `docs/audits/foundation-studio/PEN-CLOUD-03-B-RESULT.md` (runs r1/r2) and `PEN-CLOUD-03-B-R3-RESULT.md` (run r3) in `chrismarchant/foundation-engine` (PR #2). This directory holds the inputs, arms B and C, the harness and the two run outputs.

| Run | Criteria | Arm C | Summary |
|---|---|---|---|
| `results/run-r1` | r1 (plan as written) | r1 (DSC r1) | C 22 pass / 20 fail; B 16 / 13 |
| `results/run-r2` | r2 (refined, see harness/HARNESS-NOTES.md) | r2 (DSC r2, C-R2-01) | C 29 pass / 13 fail; C-SSR 27 / 11; B 16 / 13 |
| `results/run-r2/summary-r3.md` | r3 re-judgement of run r2 (D-6 accounting; D-7 rows MISSING) | r2 | C 37 pass / 3 fail / 2 missing; C-SSR 35 / 3; B 16 / 13 |
| `results/run-r3` | r3 (D-6/D-7 corrections, 27 sweep widths incl. every screen boundary) | r3 (DSC r3, C-R3-01..05) | C 41 pass / 1 fail (licence forbidden-string scan: preset package-name citation in the DSC r3 provenance text); C-SSR 38 / 0; B 16 / 13 |

Arm A (Relume React control) is outside this repository by rule (OD-25/OD-37); only its source hashes are recorded in `results/arm-a-source-hashes.txt`.

Reproduce: `cd harness && pnpm install --frozen-lockfile && pnpm run harness -- --arms B,Bp,C,Cssr --out ../results/run-<label>` (Arm A requires the untracked control directory in the same environment). Arm C regeneration: `cd arm-c && pnpm install --frozen-lockfile && pnpm generate:verify:r3` (r2 and r1 outputs: `generate:verify:r2`, `generate:verify` against commits `d2460c4` / `9498478`).
