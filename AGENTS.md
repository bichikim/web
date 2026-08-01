# AGENTS.md

## Interaction

- **Questions**: If the user is asking a question (not requesting a change), answer in chat only — do not modify code or files.
- **Examples**: If the user asks to see an example, provide it in the chat response only — do not create or edit files to demonstrate it.
- **Action requests**: If the user asks you to do something (e.g. "해줘", "만들어줘", "수정해줘"), treat it as a work request and start the task — modify code or files as needed.
- **Documentation**: When asked to add or write docs, keep it brief and concise—avoid verbosity and repeating the same points—without omitting essential meaning.

## Code quality

**Enterprise-grade** code: maintainability, scalability, separation of concerns, robust error handling, consistent patterns.

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

## GitHub CLI authentication

- `gh` credentials are stored in the macOS Keychain and may appear invalid in the default sandbox.
- If `gh auth status` fails in the sandbox, retry the command with escalated permissions before asking the user to authenticate again.
- Ask the user to run `gh auth login` only when authentication also fails with escalated permissions.

## Cursor Cloud

pnpm + Turborepo (`@winter-love/web`) · Node ≥22 · pnpm 11.x (`package.json`). `pnpm install` runs root `postinstall` → `turbo prepare-build --env-mode=loose` (package builds; Coong Supabase type gen; Turbo-cached). `--env-mode=loose` is required so pnpm 11 verify-deps does not re-enter `pnpm install` → postinstall.

- **Coong** — `apps/coong` (SolidStart SSR). `pnpm dev` (:3000). Copy `apps/coong/.env.e2e` → `.env` for dev without Supabase (see `.env.example`).
- **Storybook** — root. `pnpm storybook:dev` (:6006).

**Commands:** `pnpm lint` · `pnpm test` · `turbo prepare-build` · `pnpm typecheck` (`apps/coong`)

**Gotcha:** Without Supabase, auth/DB features error but the app renders. Re-run `turbo prepare-build` after cleaning `node_modules` or `dist/`.
