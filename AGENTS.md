# AGENTS.md

## Interaction

- **Questions**: If the user is asking a question (not requesting a change), answer in chat only — do not modify code or files.
- **Examples**: If the user asks to see an example, provide it in the chat response only — do not create or edit files to demonstrate it.
- **Action requests**: If the user asks you to do something (e.g. "해줘", "만들어줘", "수정해줘"), treat it as a work request and start the task — modify code or files as needed.
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

## Z-index

- Do not use CSS `z-index`, including utility classes and rendering-library equivalents.
- This rule does not require floating UI to become inline or in-flow. Dropdowns, popovers, tooltips, and dialogs should retain their expected overlay behavior.
- Prefer the platform top layer (`popover`, `dialog`), portals rendered later in the DOM, and headless components that handle positioning and focus without `z-index`.
- Resolve remaining layering through DOM order, layout, and stacking-context structure. Do not replace a standard overlay with an inline expansion solely to avoid `z-index`.
- Diagnose the actual painting or clipping cause before changing the DOM. Prefer the smallest suitable CSS or layout mechanism, including positioning, overflow, isolation and stacking contexts, flex/grid paint order, portal placement, or DOM order.
- Do not default to structural changes when a local CSS property can solve the problem without harming semantics, accessibility, or responsive behavior.
- If `z-index` appears unavoidable, explain why and obtain explicit user approval before using it.

## Proportionate future-proofing

- Include a foreseeable future need now when the implementation and complexity costs are small.
- Explicitly state the future need being covered and why the added effort is small.
- Do not use future-proofing to justify speculative abstractions with uncertain value.

## Package exports

- Prefer broad subpath exports: consumers may import any distributable module.
- Exposing the internal module structure is not a design flaw in this repository.
- Do not add export allowlists, proxy entrypoints, or compatibility layers solely to hide or restrict module paths. Missing exports create more consumer workarounds, coordination, and migration cost than the theoretical encapsulation benefit.
- Restrict an export only for a concrete security, runtime, or packaging constraint.

## Worktree initialization

- Start new worktrees from the latest `origin/dev` commit.
- Do not automatically merge, rebase, or reset an existing worktree with in-progress changes.

## Required after changes

1. Fix oxlint errors
2. Run oxfmt (`pnpm format`)

## Comments

Function JSDoc: contract (what) only; call sites: intent (why) only.

## AI work context (`AI_NOTE`)

Chat context is volatile. When **why** isn't obvious from code, leave a minimal in-code note for later agents.

- Format: `// AI_NOTE - …` or `/* AI_NOTE - … */`
- Content: decision + reason (constraints, rejected approach, non-obvious tradeoff); not a changelog
- Scope: cross-session gaps only; skip self-explanatory code

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
