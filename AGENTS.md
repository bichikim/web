# AGENTS.md

## Interaction

- **Examples**: If the user asks to see an example, provide it in the chat response only — do not create or edit files to demonstrate it.
- **Work confirmation**: Before starting work, state the user's request as concrete intended actions. Start only after the user confirms that interpretation.
- **Documentation**: When asked to add or write docs, keep it brief and concise—avoid verbosity and repeating the same points—without omitting essential meaning.

## Code quality

**Enterprise-grade** code: maintainability, scalability, separation of concerns, robust error handling, consistent patterns.

## File naming

- Do not repeat information already expressed by parent directories in filenames.
- Name files by their role within the containing directory.
- Apply this rule to source code, tests, documentation, configuration, scripts, and assets.
- Prefer adding a meaningful subdirectory over repeating shared context across sibling filenames.
- Keep authoring and generation details in archive filenames or metadata, not runtime filenames.
- Example: prefer `night-reading-focused/building-lights/01.webp` over `night-reading-focused/layer-building-lights-window-minus-sky-1.webp`.

- When correcting AI behavior, use the lowest-prompt-cost instruction that preserves the outcome.
- Evaluate changes in repository-wide context, prioritizing compatibility, reusability, and readability over local optimization.
- Do not treat prevalence as evidence of quality; make decisions at the standard of top 5% expert judgment.

## Evidence

- Do not make factual or technical claims without showing the decisive evidence to the user.
- Prefer evidence from the actual project and runtime over assumptions based on learned patterns.
- When evidence is unavailable, run the smallest safe experiment that can answer the question.
- If no evidence exists and no viable experiment is possible, do not infer or speculate. Tell the user that the answer cannot be verified and why.

## Z-index

- Do not use `z-index`, including utility classes and rendering-library equivalents. If it appears unavoidable, explain why and obtain explicit user approval.
- Preserve overlay semantics, positioning, and focus; do not turn overlays into inline content. Diagnose painting or clipping first, then use the smallest suitable fix through the platform top layer, an existing portal or headless primitive, DOM order, overflow/layout, or stacking contexts.

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

pnpm + Turborepo (`@winter-love/web`) · Node ≥22 · pnpm 11.x (`package.json`). `pnpm install` runs root `postinstall` → `turbo prepare-build` (package builds; Coong Supabase type gen; Turbo-cached). `optimisticRepeatInstall: false` in `pnpm-workspace.yaml` so postinstall still runs when Already up to date. `globalPassThroughEnv` includes `pnpm_config_verify_deps_before_run` so Turbo strict mode does not strip pnpm 11’s lifecycle marker (which would re-enter `pnpm install` → postinstall).

- **Coong** — `apps/coong` (SolidStart SSR). `pnpm dev` (:3000). Copy `apps/coong/.env.e2e` → `.env` for dev without Supabase (see `.env.example`).
- **Storybook** — root. `pnpm storybook:dev` (:6006).

**Commands:** `pnpm lint` · `pnpm test` · `turbo prepare-build` · `pnpm typecheck` (`apps/coong`)

**Gotcha:** Without Supabase, auth/DB features error but the app renders. Re-run `turbo prepare-build` after cleaning `node_modules` or `dist/`.
