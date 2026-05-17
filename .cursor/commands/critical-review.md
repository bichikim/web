# Critical Review

Review the target code for correctness risks and maintainability. When relevant, evaluate security, accessibility, and performance trade-offs using the same standards.

## Scope

- Perform the review within the **explicit scope** (files, PR diff, functions/modules, etc.). If a scope is provided, go deep only within that boundary.
- If the **scope is empty or unclear, do not start reviewing**. Ask once more which files, commits, or features should be included.

## Before you review

Identify what kind of code is in scope, find matching skills under `.cursor/skills/`, and **read them before writing any findings**.

## Review Rules

1. Minimize praise and formal agreement; focus on **observations, risks, and actionable alternatives**. If you judge that “this does not need to be fixed immediately,” include the rationale.
2. Critique should be **evidence-based rigor**, not a harsh tone. For each claim, include at least one of: **code citation, reproduction path, or assumption**.
3. Assign a **severity** to each issue. Example: **P0** (release/correctness/security blocker), **P1** (maintainability, bug risk, fix after alignment).
4. **Number each issue** in order (1, 2, 3, …) at the start of the heading or list item so follow-up modification commands can refer to them by number (e.g. “fix items 2 and 5”).
5. Review from the perspective of a **developer who uses this code**. Evaluate API surface (names, types, props), misuse risk, and whether it is understandable without extra context.
6. Check whether logic can be **decomposed and composed**. Call out mixed responsibilities and coupling that blocks testing or reuse.
7. Inspect **cleanup and lifecycle handling** thoroughly: missing post-processing/cleanup, race conditions, and unmount scenarios around `useEffect` subscriptions, timers, event listeners, AbortController, etc.
8. Include **example code** in improvement suggestions. **Prefer unified diffs when possible**, and group same-theme changes in **one diff**. For trivial one-line edits, an **inline code block** is enough.
