# AGENTS.md

## Component prefixes

- Styled components normally use the `S` prefix and headless components use `H`; in Pomo, styled components use `P` instead of `S`.

## SolidStart and Solid.js

- Pomo is SolidStart on Solid.js. Use SolidStart and Solid.js folder layouts, file conventions, APIs, and component patterns.
- Follow current SolidStart and Solid.js documentation for structure.

## Runtime topology

- Design every Pomo server-side feature assuming that at least two application instances run concurrently. Do not rely on process-local memory for shared state, coordination, deduplication, locking, rate limiting, or exactly-once behavior; enforce correctness through a shared durable system.

## Platform scope

- Before implementing a Pomo feature, determine whether it can support regular web, mobile apps, PWA, Apps in Toss, and desktop apps.

## Apps in Toss

- For Apps in Toss runtime verification, run `pnpm --filter @apps/pomo dev:apps-in-toss` from the repository root and open the printed local URL.
- If verification cannot be completed, report the blocker, continue other applicable checks, and identify the runtime behavior that remains unverified.
- Do not replace documented Apps in Toss behavior with general web conventions. Disclose unsupported mappings or conflicts and ask before deviating.
