# AGENTS.md

## Code quality

**Enterprise-grade** code: maintainability, scalability, separation of concerns, robust error handling, consistent patterns.

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

## Cursor Cloud

pnpm + Turborepo (`@winter-love/web`) · Node ≥22 · pnpm 10.x (`package.json`). `pnpm install` runs workspace `prepare` (package builds; Coong Supabase type gen).

- **Coong** — `apps/coong` (SolidStart SSR). `pnpm dev` (:3000). Copy `apps/coong/.env.e2e` → `.env` for dev without Supabase (see `.env.example`).
- **Storybook** — root. `pnpm storybook:dev` (:6006).

**Commands:** `pnpm lint` · `pnpm test` · `pnpm -r prepare` · `pnpm typecheck` (`apps/coong`)

**Gotcha:** Without Supabase, auth/DB features error but the app renders. Re-run `pnpm -r prepare` after cleaning `node_modules` or `dist/`.
