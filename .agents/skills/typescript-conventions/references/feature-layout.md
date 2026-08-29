# `src/features` Layout

Apply this layout only under `src/features`. Keep a feature in `index.ts` when one file is enough.

```text
src/features/<feature>/
├─ index.ts
├─ a.ts      # when needed
└─ b.ts      # when needed
```

When splitting files, `index.ts` must re-export each sibling module. Do not review that export list.
