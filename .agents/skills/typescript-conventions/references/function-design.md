# Function Design

## Inputs

- First consider inexpensive, foreseeable caller-controlled parameters; then consider collections when flexibility outweighs implementation, validation, and maintenance cost. Do not force unnecessary repeated single-value calls or add parallel single/collection APIs without concrete need.
- State the foreseeable use and small added cost. Preserve domain invariants; avoid speculative configuration. Specify empty-input, ordering, and duplicate semantics where relevant.
- Accept required data directly; do not wrap one existing value solely for packaging. Use options objects for meaningful configuration.
- When callers need different invalid-input policies, expose validation and fallback configuration. Document defaults, preserve domain-meaningful values and fixed invariants, and infer configured fallback types without unnecessarily widening returns.

## Reuse and Decomposition

1. Prefer suitable, runtime-supported built-ins, excluding prohibited APIs. Otherwise check public APIs in utility libraries, the framework, runtime, and project code; consider a broadly reusable domain-independent operation if none fits.
2. Consider a broader-domain operation for remaining logic.
3. Compose suitable operations into the feature-specific function. Do not invent abstractions merely to fill these levels.

- Before implementing specialized operations without a suitable API, investigate maintained external libraries. Compare public contracts and edge cases; weigh dependency cost against implementation and maintenance. Adapt only missing semantics.
- Separate independently useful transformations from caller policy and compose at the use site. Name recurring compositions without removing the underlying operations.
- Extract functions/hooks for useful reusable contracts, not encapsulation alone. Broader reuse is a stronger signal; a single caller or one-line body is acceptable when naming aids comprehension.
- Verify input and behavior compatibility; similar names or private helpers are insufficient. Name/document actual behavior, not incidental use. Prefer meaningful names over explanatory comments; retain comments for intent or constraints names cannot express.
- Choose shared placement by generality and credible reuse, not caller count or purity alone. Keep feature-specific operations with their feature.
- For replacements/adapters, verify observable results, errors, ordering, and actual callers; avoid assertions tied to noncontractual implementation details.

## Asynchronous Calls

- When designing reusable asynchronous APIs, specify whether overlapping calls queue, share work, or skip; define result-sharing, cache identity, failure retry, and wait scope where applicable.
- When callers must distinguish unaccepted/unexecuted requests, return an explicit outcome across asynchronous boundaries, separate from active work's lifecycle.
- Preserve these contracts during structural refactors unless the task requires change. Apply the error-contract resource routed from `SKILL.md` for failure/cancellation semantics.

## Ownership and Results

- Return meaningful results, not unchanged inputs or copies made solely to justify returning them.
- Content mutations count as changes even with unchanged identity. Prefer copying modified portions without mutating caller-owned data.
- Preserve caller-provided DOM identity; do not clone or return those elements. Return results or capabilities.
