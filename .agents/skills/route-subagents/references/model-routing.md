# Model Routing Examples

Apply `SKILL.md`'s delegation gate first. These defaults do not authorize new edits or external actions.

## Effort

| Route          | Shape                                                             | Examples                                                                                                                                       |
| -------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Luna `low`     | Tool output or explicit rules determine the answer                | Inspected scripts; `rg` inventories; source/test matching; known-field extraction; hashes; links; filenames                                    |
| Luna `medium`  | Narrow classification, explanation, or pattern application        | Log summaries; document comparison; cited extraction; repetitive fixtures; cases from an explicit contract; isolated demonstrated transforms   |
| Luna `high`    | Several steps or sources under a strict rubric and cheap verifier | Reconcile logs against invariants; property-test cases; typechecked migration candidate; scored option ranking; verified data-flow trace       |
| Luna `max`     | Deep exploration remains narrow and objectively checkable         | Bounded corpus search; isolated algorithm with benchmarks; candidate search with formal checks; complete-trace analysis against fixed behavior |
| Terra `medium` | Ordinary cross-file judgment and ownership                        | Feature implementation; source-aware unit tests; failure repair; API-version consequences                                                      |
| Terra `high`   | Complex logic, interactions, or edge cases                        | Async/lifecycle refactor; flaky-test diagnosis; correctness review; conflicting-source reconciliation                                          |
| Sol or parent  | Requirements, risk, or architecture are ambiguous/high impact     | Security, payments, authentication, data loss, public API boundaries, disputed expected behavior                                               |

Higher Luna effort is for harder work of the same narrow shape. Switch to Terra when scope or ownership broadens; switch to Sol or the parent when the decision itself becomes ambiguous or high risk.

## Contrast examples

| Progression                                                                                                                                | Route                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Run inspected lint/typecheck/tests → summarize known failures → diagnose/fix → change lint policy                                          | Luna `low` → Luna `medium` → Terra `medium` → parent/Sol                    |
| Collect official pages → summarize with citations → reconcile conflicts → decide legal/compliance consequence                              | Luna `low` → Luna `medium` → Terra `high` → parent/Sol                      |
| Find untested files → enumerate cases/fixtures → write ordinary tests → test async/races → define expected behavior                        | Luna `low` → Luna `medium` → Terra `medium` → Terra `high` → parent/Sol     |
| Map review paths → check a precise checklist → review correctness → review security/data-loss severity                                     | Luna `low` → Luna `medium` → Terra `high` → parent/Sol                      |
| Classify known log signatures → infer from complete bounded logs → reproduce fixed steps → adapt diagnosis after each observation          | Luna `low` → Luna `medium` → Terra `medium` → parent                        |
| Apply an isolated demonstrated mapping → implement difficult local logic → optimize against benchmark/property tests → change architecture | Luna `medium` → Luna `high` → Luna `max` → parent/Sol                       |
| Search unrelated topics independently → combine results → interpret cross-codebase consequences                                            | Parallel Luna workers → parent synthesis → Terra or parent judgment         |
| Run one command → run several related finite commands                                                                                      | Luna `low` → one Luna `low` worker sequentially, not one worker per command |

## Hard boundaries

- Parent runs dev/Storybook/watch/UI processes and mutating `format`, fix, generator, cleanup, or lifecycle scripts.
- Installs, deploys, publishing, Chromatic, secrets, and other external effects require their normal authorization workflow.
- Stop and return control when a worker needs new authority, overlapping writes, or work outside scope.
- Escalate contradictory or failed Luna work to Terra, then Sol only if difficult judgment remains.
- Accept complete successful evidence; do not rerun it on a stronger model without a concrete gap.
