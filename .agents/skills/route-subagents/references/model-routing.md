# Model Routing

Apply `SKILL.md`'s delegation gate first. These defaults do not authorize new edits or external actions.

## Fixed routes

| Route                  | Use when                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `gpt-5.6-luna` + `max` | General coding, cross-file analysis, review, implementation, unit tests, mechanical execution, and other bounded work |
| `gpt-6-astra` + `high` | Complex design, ambiguous bugs, high-risk decisions, difficult logic, and final integration review                    |

Luna `max` is the default route. Use Astra `high` when the task's complexity, ambiguity, risk, or integration responsibility requires deeper judgment. The parent retains authorization, integration ownership, and final judgment.

## Routing examples

| Work shape                                                                                                    | Route                              |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| General feature implementation, source-aware unit tests, finite test execution, or repetitive fixture work    | Luna `max`                         |
| Cross-file analysis with a clear contract and objectively checkable result                                    | Luna `max`                         |
| Complex async, lifecycle, storage, timer, concurrency, or mock-validity reasoning                             | Astra `high`                       |
| Ambiguous requirements, high-risk behavior, security or data-loss consequences, or disputed expected behavior | Astra `high`                       |
| Final integration review after implementation                                                                 | Astra `high`, then parent judgment |

## Hard boundaries

- The parent runs dev/Storybook/watch/UI processes and mutating `format`, fix, generator, cleanup, or lifecycle scripts.
- Installs, deploys, publishing, Chromatic, secrets, and other external effects require their normal authorization workflow.
- Stop and return control when a worker needs new authority, overlapping writes, or work outside scope.
- Accept complete successful evidence; do not rerun it on a stronger model without a concrete gap.
