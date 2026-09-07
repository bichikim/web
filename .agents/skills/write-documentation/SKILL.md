---
name: write-documentation
description: Write or edit codebase documentation without duplicating code, keeping it beside its subject.
---

# Write Documentation

Keep documentation as small as possible and place it beside its subject.

## Principles

- Do not repeat information already expressed in code. When documentation must expose that information, link to the authoritative code instead.
- For JavaScript and TypeScript, use comments when they can provide the required documentation, following the project's comment conventions.
- When file-level documentation cannot be expressed as comments, place a same-named `.md` file beside the target file. Example: `player.ts` → `player.md`.
- Document a directory as a whole in that directory's `README.md`.
- Before creating broader documentation, check whether a smaller document beside the subject is sufficient.
