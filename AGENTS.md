# AGENTS.md

## Cursor Cloud specific instructions

### Overview
This is a pnpm + Turborepo monorepo (`@winter-love/web`). The main app is **Coong** (`apps/coong`) — a SolidStart SSR app. There is also a root-level **Storybook** for component development.

### Prerequisites
- Node.js 22, pnpm 10.26.1 (both specified in `package.json` `engines` / `packageManager`)
- `pnpm install` runs `postinstall` (sorts package.json) and `prepare` (builds all `@winter-love/*` packages via Turborepo) automatically

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Coong App | `pnpm dev` (in `apps/coong`) | 3000 | Requires `.env` — copy from `.env.e2e` for local dev without real Supabase |
| Storybook | `pnpm dev:storybook` (from root) | 6006 | Component explorer for all Solid.js packages |

### Key commands
- **Lint**: `pnpm lint` (runs `turbo lint` across all packages) — note: `@winter-love/utils` has pre-existing lint errors
- **Test**: `pnpm test` (runs `vitest run` across all packages)
- **Build packages**: `pnpm prepare` (runs `turbo build --filter=@winter-love/*`)
- **Type check (Coong)**: `pnpm type-check` in `apps/coong`

### Gotchas
- The `.env` template file in `apps/coong` is named `.env.exmaple` (typo is intentional in the repo — do not rename).
- For local dev without a real Supabase instance, copy `apps/coong/.env.e2e` to `apps/coong/.env`. Database-dependent features (auth, user data) will error at runtime but the app starts and renders.
- Shared library packages must be built before apps work. This happens automatically via pnpm's `prepare` lifecycle, but if you clean `node_modules` or delete `dist/` folders you must run `pnpm prepare` again.
- `@winter-love/utils` lint has pre-existing errors (camelcase, max-params) — these are not regressions.
