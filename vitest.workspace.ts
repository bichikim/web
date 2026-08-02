import type {TestProjectConfiguration} from 'vitest/config'

/**
 * Always use the root `./vitest.config.mts` — do not list per-package projects.
 *
 * AI_NOTE - `@winter-love/vite-plugin-monorepo-alias` (`matchWorkspace`) picks
 * the `/apps/` or `/packages/` segment whose prefix equals the monorepo `root`.
 * Nested paths like `.../apps/web/.../apps/coong/` need that single root config;
 * per-package Vitest roots would resolve the wrong workspace and break aliases.
 */
const workspace: TestProjectConfiguration[] = ['./vitest.config.mts']
export default workspace
