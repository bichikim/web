# AGENTS.md

## Component prefixes

- In Pomo, use `P` for styled components instead of the [Solid.js default](../../.agents/skills/solidjs/references/component-authoring.md#files). Use `H` for headless components.

## SolidStart and Solid.js

- Use the current SolidStart and Solid.js folder layouts, file conventions, APIs, and component patterns, following official documentation for structure.

## Runtime topology

- Design every Pomo server-side feature assuming that at least two application instances run concurrently. Do not rely on process-local memory for shared state, coordination, deduplication, locking, rate limiting, or exactly-once behavior; enforce correctness through a shared durable system.

## Platform scope

- Before implementing a Pomo feature, determine whether it can support regular web, mobile apps, PWA, Apps in Toss, and desktop apps.

## Apps in Toss

- For Apps in Toss runtime verification, run `pnpm --filter @apps/pomo dev:apps-in-toss` from the repository root and open the printed local URL.
- If verification is blocked, continue the other applicable checks and report the unverified Toss behavior under the root evidence and completion rules.
- Do not replace documented Apps in Toss behavior with general web conventions. Disclose unsupported mappings or conflicts and ask before deviating.
