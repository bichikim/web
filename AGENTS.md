# AGENTS.md

## Interaction

- **Examples**: If the user asks to see an example, provide it in the chat response only — do not create or edit files to demonstrate it.
- **Intent analysis (mandatory)**: Before interpreting, use grammatical cues—particles, adverbs, comparisons—presuppositions, and dialogue context to reconstruct all contrasted or additive sides and the user's baseline: actual state, experience or memory, or prior dialogue. Preserve named entities and categories. If a reading leaves a cue unexplained, substitutes a related concept, or makes the user seem irrational, seek the coherent ordinary pragmatic reading before correcting them.
  - “Starting with N, does X also move to Y?” presupposes that X was previously outside Y or handled differently in the user's experience; verify the actual state without replacing X. In the SolidStart example, retain server routes and their prior separate location—not API routes already in `src/routes`.
- **Intent gate**: Before any answer or tool call, state the resulting concrete interpretation.
- **Documentation**: When asked to add or write docs, keep it brief and concise—avoid verbosity and repeating the same points—without omitting essential meaning.

## Code quality

**Enterprise-grade** code: maintainability, scalability, separation of concerns, robust error handling, consistent patterns.

## File naming

- Across source code, tests, documentation, configuration, scripts, and assets, name files by their role within the containing directory without repeating parent-directory context; use meaningful subdirectories for context shared by siblings.
- Keep authoring and generation details in archive filenames or metadata, not runtime filenames.

## Decision quality

- When correcting AI behavior, use the lowest-prompt-cost instruction that preserves the outcome.
- Evaluate changes in repository-wide context, prioritizing compatibility, reusability, and readability over local optimization.
- Do not treat prevalence as evidence of quality; make decisions at the standard of top 5% expert judgment.

## Evidence

- Do not make factual or technical claims without showing the decisive evidence to the user.
- Verify changeable external information from a current authoritative internet source in the same turn before claiming it; learned knowledge, prior conversation, and the repository's local state are not substitutes for current external evidence.
- Before using any term, status, label, or qualifier to reach a conclusion, establish its exact meaning in context from authoritative evidence. Do not skip that meaning or infer consequences from familiarity or connotation; verify the consequence relevant to the user's question separately.
- Prefer evidence from the actual project and runtime over assumptions based on learned patterns.
- When evidence is unavailable, run the smallest safe experiment that can answer the question.
- If no evidence exists and no viable experiment is possible, do not infer or speculate. Tell the user that the answer cannot be verified and why.

## Architecture authority

- Treat current official documentation as binding for folder structure and code design. If existing or proposed code differs, disclose the difference and reason before implementation; do not deviate unless the user explicitly directs it.
- If official documentation does not map directly to the code, analyze multiple analogous implementations from authoritative maintainers or projects, show the decisive evidence, and choose the best-supported pattern instead of inventing a familiar local design.

## Layering without z-index

- Preserve the requested visual composition and interaction behavior. The `z-index` restriction does not permit removing, flattening, inlining, relocating, or simplifying overlapping, floating, sticky, fixed, or overlay elements.
- Do not use `z-index`, including utility classes and rendering-library equivalents.
- When layering is required, reproduce the intended result by diagnosing painting and clipping first, then use the appropriate platform mechanism: the top layer, an existing portal or headless primitive, DOM order, overflow or containing-block correction, layout structure, or non-numeric stacking-context structure.
- Treat the solution as complete only when the intended visual hierarchy, overlap and placement, clipping, pointer interaction, keyboard focus, and accessibility semantics are preserved in every relevant state.
- If exact equivalence is impossible without `z-index`, do not silently weaken or abandon the design. Show the concrete blocker and obtain explicit user approval before using the smallest necessary `z-index`.

## Proportionate future-proofing

- Include a foreseeable future need now when the implementation and complexity costs are small.
- Explicitly state the future need being covered and why the added effort is small.
- Do not use future-proofing to justify speculative abstractions with uncertain value.

## Package exports

- Prefer broad subpath exports for every distributable module; do not add allowlists, proxy entrypoints, or compatibility layers for encapsulation alone, and restrict exports only for concrete security, runtime, or packaging constraints.

## Worktree initialization

- Start new worktrees from the latest `origin/dev` commit.
- Do not automatically merge, rebase, or reset an existing worktree with in-progress changes.

## Required after changes

1. Fix oxlint errors
2. Run oxfmt (`pnpm format`)

## Comments

Function JSDoc: contract (what) only; call sites: intent (why) only.

## Pull requests

- Wait for required CI checks when appropriate, but do not wait for Vercel deployment checks to complete. Report pending Vercel checks and finish the task.

## GitHub CLI authentication

- `gh` credentials are stored in the macOS Keychain and may appear invalid in the default sandbox.
- If `gh auth status` fails in the sandbox, retry the command with escalated permissions before asking the user to authenticate again.
- Ask the user to run `gh auth login` only when authentication also fails with escalated permissions.

## Dependency installation

When dependency installation is required:

- Do not run `pnpm install` or `pnpm i` inside the sandbox first.
- Always request escalated execution for `pnpm install` or `pnpm i` from the first attempt.
- Use the global pnpm store.
- Do not create or use a local `.pnpm-store`.
- Do not add `store-dir=.pnpm-store` to `.npmrc`.

## Cursor Cloud

pnpm + Turborepo (`@winter-love/web`) · Node ≥24 · pnpm 11.x (`package.json`). `pnpm install` runs root `postinstall` → `turbo prepare-build` (package builds; Coong Supabase type gen; Turbo-cached). `optimisticRepeatInstall: false` in `pnpm-workspace.yaml` so postinstall still runs when Already up to date. `globalPassThroughEnv` includes `pnpm_config_verify_deps_before_run` so Turbo strict mode does not strip pnpm 11’s lifecycle marker (which would re-enter `pnpm install` → postinstall).

- **Coong** — `apps/coong` (SolidStart SSR). `pnpm dev` (:3000). Copy `apps/coong/.env.e2e` → `.env` for dev without Supabase (see `.env.example`).
- **Storybook** — root. `pnpm storybook:dev` (:6006).

**Commands:** `pnpm lint` · `pnpm test` · `turbo prepare-build` · `pnpm typecheck` (`apps/coong`)

**Gotcha:** Without Supabase, auth/DB features error but the app renders. Re-run `turbo prepare-build` after cleaning `node_modules` or `dist/`.
