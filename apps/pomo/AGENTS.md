# AGENTS.md

## SolidStart, not Next.js or React

- Pomo is SolidStart on Solid.js. Do not apply Next.js or React folder layouts, file conventions, APIs, or component patterns.
- Follow current SolidStart and Solid.js documentation for structure.

## Runtime topology

- Design every Pomo server-side feature assuming that at least two application instances run concurrently. Do not rely on process-local memory for shared state, coordination, deduplication, locking, rate limiting, or exactly-once behavior; enforce correctness through a shared durable system.

## Apps in Toss

- Before implementing a Pomo feature, determine whether it targets regular web, Apps in Toss, or both.
- Check the current official Apps in Toss documentation when selecting platform behavior. If it requires or recommends an approach different from regular web, use that approach for the Apps in Toss build and preserve regular web behavior behind an explicit build-target boundary.
- Do not replace documented Apps in Toss behavior with general web conventions. Disclose unsupported mappings or conflicts and ask before deviating.
