# PEN-CLOUD-03-B — Result (experiment-repository copy)

The authoritative record is `docs/audits/foundation-studio/PEN-CLOUD-03-B-RESULT.md` in `chrismarchant/foundation-engine` (PR #2). This directory holds the inputs, arms B and C, the harness and the two run outputs.

| Run | Criteria | Arm C | Summary |
|---|---|---|---|
| `results/run-r1` | r1 (plan as written) | r1 (DSC r1) | C 22 pass / 20 fail; B 16 / 13 |
| `results/run-r2` | r2 (refined, see harness/HARNESS-NOTES.md) | r2 (DSC r2, C-R2-01) | C 29 pass / 13 fail; C-SSR 27 / 11; B 16 / 13 |

Arm A (Relume React control) is outside this repository by rule (OD-25/OD-37); only its source hashes are recorded in `results/arm-a-source-hashes.txt`.

Reproduce: `cd harness && pnpm install --frozen-lockfile && pnpm run harness -- --arms B,Bp,C,Cssr --out ../results/run-<label>` (Arm A requires the untracked control directory in the same environment). Arm C regeneration: `cd arm-c && pnpm install --frozen-lockfile && pnpm generate:verify:r2`.
