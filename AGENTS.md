# AGENTS.md

## Code quality

All structural design and code in this repository must be written at **enterprise grade** — maintainability, scalability, clear separation of concerns, robust error handling, and consistent patterns across the codebase.

## Required after changes

1. Fix oxlint errors
2. Run oxfmt (`pnpm format`)

## Cursor Cloud specific instructions

pnpm + Turborepo (`@winter-love/web`). **Coong** `apps/coong` (SolidStart SSR) · **Storybook** at repo root. Node ≥22, pnpm 10.x (`package.json` `engines` / `packageManager`). `pnpm install` runs workspace `prepare` scripts (package builds; Coong runs Supabase type gen).

- **Coong** — `pnpm dev` in `apps/coong` (:3000). Copy `apps/coong/.env.e2e` → `.env` for dev without Supabase (see `.env.example`).
- **Storybook** — `pnpm storybook:dev` at root (:6006).

**Commands:** `pnpm lint` (oxlint) · `pnpm test` · `pnpm -r prepare` (rebuild workspace packages) · `pnpm typecheck` in `apps/coong`

**Gotchas:** Without Supabase, auth/DB features error but the app renders. Re-run `pnpm -r prepare` after cleaning `node_modules` or `dist/`.
