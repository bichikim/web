# AGENTS.md

## Interaction

- **Examples**: If the user asks only to see an example, provide it in the chat response without creating or editing files. If the user asks to build something from an example and its implementation code is available, study that implementation before implementing it.
- **Intent gate**: State the concrete interpretation at task start and when the scope or direction changes.
- **Existing code references**: When discussing existing code, always include a clickable link to its exact file and line number so the link opens at that line.

## UI communication

- Keep user-facing UI text concise; avoid verbose explanations and persistent status text whenever possible.
- Prefer toasts or other transient feedback that does not consume layout space. Keep routine success silent; show concise feedback when the user needs to act.
- Use persistent inline guidance only when it is necessary to complete the current task or understand the current state.

## Code review

- For Codex code reviews, read and follow the `critical-review` skill at `.agents/skills/critical-review/SKILL.md`.

## Styling ownership

- Do not create standalone `.css` files on your own initiative. Before creating or adding usage of a standalone `.css` file, explain why it is needed and obtain explicit user approval.
- Follow UnoCSS styling methods for all visual style values.
- JavaScript and TypeScript may communicate semantic state through classes or data attributes and inject runtime values through CSS custom properties.
- If other style handling in JavaScript or TypeScript is needed, first present the concrete reason and alternatives and obtain explicit user approval.

## Scripts

- Before adding a script entry to any `package.json`, obtain explicit user approval.
- Treat code under `scripts` as standalone; it must not import or use code from `src`.
- If reusing `src` from a script appears necessary, obtain explicit user approval before adding the dependency.

## xctrace profiling

- After each `xctrace` run finishes, preserve the needed results, delete the `$TMPDIR/instruments*.ktrace` temporary files created by that run, and verify their removal. Check that the files are closed before deleting them and leave files from other runs alone.

## React dependencies

- Do not introduce React or React-specific libraries, whether directly or through a new transitive dependency.

## File naming

- Across source code, tests, documentation, configuration, scripts, and assets, name files by their role within the containing directory; use meaningful subdirectories for context shared by siblings.
- Keep authoring and generation details in archive filenames or metadata, not runtime filenames.

## Decision quality

- When implementing a feature, prefer event-driven work whenever the relevant event or completion signal is available. Before using `setTimeout` or `setInterval`, explain why an event-driven approach is insufficient and obtain explicit user approval.
- **Declarative programming (required; very important)**: Write code declaratively by composing reusable operations. Judge readability by how clearly the composition expresses intent, not by code length.
- Evaluate changes in repository-wide context, prioritizing compatibility, reusability, and readability over local optimization.

## LLM이 판단하는 기능

- 처리 순서는 **판단에 필요한 데이터 → LLM 판단·출력 → 출력 사용**으로 한다.
- 코드는 입력을 검증하고 규칙이 명확한 계산을 수행한다. 사용자 원문과 판단에 필요한 사실을 LLM에 전달한다.
- 키워드, 정규식, 휴리스틱으로 사용자 의도를 미리 판단해 질문을 바꾸거나, 근거를 걸러내거나, 응답 경로를 결정하지 않는다.
- 프롬프트에는 판단 기준, 시점과 맥락에 관한 유의사항, 데이터의 한계, 출력 형식을 명시할 수 있다. 질문에 어떤 기준을 적용하고 어떻게 답할지는 LLM이 판단한다.
- 코드는 출력 형식과 후속 처리 조건을 검증한 뒤 모델의 출력을 사용한다.

## Side effects

- Write computation and transformation logic as pure functions whenever possible, and concentrate side effects at input/output boundaries.
- Implement ordinary side effects needed to fulfill the user's requested functionality without separate approval.
- Obtain approval before implementing external changes beyond the requested scope, destructive operations, or actions requiring new permissions or costs.

## Evidence and completion

- Keep the user's requested outcome, scope, constraints, and completion criteria throughout the work. Before reporting completion, compare the result with every criterion and cite decisive evidence for each.
- Match evidence to the claim. Distinguish source inspection, executed checks, and verified outcomes. Verify runtime behavior when the outcome depends on it and limit test claims to the assertions and environment exercised. Verify changeable external information against current authoritative sources in the same turn.
- When direct evidence is missing, run the smallest relevant test or runtime experiment. Distinguish product defects from setup, runner, sandbox, and environment failures. If evidence remains unavailable, report verified progress and the exact gap or blocker. Report the task as complete only once every criterion is met and verified.

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

## Unit test execution time

- Write each Vitest unit test to complete within 150ms when run in isolation. This authoring target does not set a file or suite timeout. For a test exceeding that authoring target, follow the [unit-test diagnosis workflow](.agents/skills/unit-test/SKILL.md#execution-time).

## Required after changes

1. Fix oxlint errors
2. Run oxfmt (`pnpm format`)

## GitHub CLI authentication

- `gh` credentials are stored in the macOS Keychain and may appear invalid in the default sandbox.
- If `gh auth status` fails in the sandbox, retry the command with escalated permissions before asking the user to authenticate again.
- Ask the user to run `gh auth login` only when authentication also fails with escalated permissions.

## Dependency installation

- Request escalated execution for `pnpm install` or `pnpm i` on the first attempt.
- Use the global pnpm store. Do not create or use a local `.pnpm-store` or configure it in `.npmrc`.

## Cursor Cloud

See the [workspace README](README.md) for pnpm/Turbo setup and [package.json](package.json) for Node and pnpm versions. When changing the install lifecycle, preserve repeat-install `postinstall` and pass pnpm’s lifecycle marker through Turbo to avoid recursive installation. See [pnpm-workspace.yaml](pnpm-workspace.yaml) and [turbo.json](turbo.json).

- **Coong** — `apps/coong` (SolidStart SSR). `pnpm dev` (:3000). Copy `apps/coong/.env.e2e` → `.env` for dev without Supabase (see `.env.example`).
- **Pomo** — `apps/pomo` (SolidStart SSR). `pnpm dev --port 3300` (:3300).
- **Storybook** — root. `pnpm storybook:dev` (:6006).

**Commands:** `pnpm lint` · `pnpm test` · `turbo prepare-build` · `pnpm typecheck` (`apps/coong`)

**Gotcha:** Without Supabase, auth/DB features error but the app renders. Re-run `turbo prepare-build` after cleaning `node_modules` or `dist/`.
