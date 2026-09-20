# AGENTS.md

## Interaction

- **Examples**: If the user asks only to see an example, provide it in the chat response without creating or editing files. If the user asks to build something from an example and its implementation code is available, study that implementation before implementing it.
- **Intent gate**: State the concrete interpretation at task start and when the scope or direction changes.
- **Existing code references**: When discussing existing code, always include its file path.

## Styling ownership

- Prefer UnoCSS over standalone `.css` files. Before creating or adding usage of a standalone `.css` file, explain why it is needed and obtain explicit user approval.
- UnoCSS owns all visual style values.
- JavaScript and TypeScript may communicate semantic state through classes or data attributes and inject runtime values through CSS custom properties; UnoCSS must define how those values affect visual styling.
- JavaScript and TypeScript must not otherwise create style values or set them directly on the DOM.
- If preserving the requested behavior requires other style handling in JavaScript or TypeScript, first present the concrete reason and alternatives and obtain explicit user approval.

## Scripts

- Before adding a script entry to any `package.json`, obtain explicit user approval.
- Treat code under `scripts` as standalone; it must not import or use code from `src`.
- If reusing `src` from a script appears necessary, obtain explicit user approval before adding the dependency.

## File naming

- Across source code, tests, documentation, configuration, scripts, and assets, name files by their role within the containing directory; use meaningful subdirectories for context shared by siblings.
- Keep authoring and generation details in archive filenames or metadata, not runtime filenames.

## Decision quality

- Prefer event-driven work whenever the relevant event or completion signal is available. Use `setTimeout` or `setInterval` only when necessary, after explaining why an event-driven approach is insufficient and obtaining explicit user approval.
- **Declarative programming (required)**: Write code declaratively by composing reusable operations. Judge readability by how clearly the composition expresses intent, not by code length.
- When correcting AI behavior, use the lowest-prompt-cost instruction that preserves the outcome.
- Evaluate changes in repository-wide context, prioritizing compatibility, reusability, and readability over local optimization.
- Do not treat prevalence as evidence of quality.

## Evidence

- Treat assumptions as assumptions, not facts. Establish factual or technical conclusions from the source capable of proving them: the actual project's files, configuration, data, runtime, executed tests, current authoritative documentation, or a focused experiment.
- Match the evidence to the claim: source inspection does not prove runtime behavior, an unexecuted test does not prove behavior, and a passing test proves only the assertions and environment it exercised. For changeable external information, verify the exact meaning and relevant consequence from a current authoritative source in the same turn.
- When direct evidence is missing, run the smallest relevant test or runtime experiment and distinguish product defects from setup, runner, sandbox, and environment failures.
- Show the decisive evidence. If no permitted source or viable experiment can establish the claim, state that it cannot be determined instead of guessing.

## Architecture authority

- Follow explicit requirements in current official documentation. Disclose conflicts with those requirements before implementation; do not deviate unless the user explicitly directs it.
- Where official documentation leaves design or folder structure open, decide using project contracts and relevant evidence. Consult authoritative implementations when needed to resolve a material uncertainty.

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

## Terminology

- Never call code, APIs, exports, types, or control flow "safe" except when the claim is about security. There is nothing else in code to label safe.

## Worktree initialization

- Start new worktrees from the latest `origin/dev` commit.
- Do not automatically merge, rebase, or reset an existing worktree with in-progress changes.

## Pomo local servers

- Run Pomo commands that bind a local port—including Vite, Playwright, Storybook browser tests, Wallaby, and Wrangler local tooling—with escalated permissions on the first attempt. Treat loopback `listen EPERM` as a sandbox restriction, retry the same command in the approved context, and verify it there before attributing the failure to product code.

## Required after changes

1. Fix oxlint errors
2. Run oxfmt (`pnpm format`)

## Comments

Function JSDoc: contract (what) only; call sites: intent (why) only.

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
- **Pomo** — `apps/pomo` (SolidStart SSR). `pnpm dev --port 3300` (:3300).
- **Storybook** — root. `pnpm storybook:dev` (:6006).

**Commands:** `pnpm lint` · `pnpm test` · `turbo prepare-build` · `pnpm typecheck` (`apps/coong`)

**Gotcha:** Without Supabase, auth/DB features error but the app renders. Re-run `turbo prepare-build` after cleaning `node_modules` or `dist/`.

<!-- graft:start -->

## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).

<!-- graft:end -->
