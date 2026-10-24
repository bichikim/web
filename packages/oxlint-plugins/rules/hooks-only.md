# hooks-only

```ts
'project/hooks-only': ['error', ['apps/pomo/src/hooks']]
```

Options are directory roots, not filename patterns. Use `['hooks']` to match any directory
named `hooks`. Each immediate child directory is a topic; nested directories belong to it.
No filename or `useXxx` naming convention establishes whether a declaration is a hook.

A topic needs a function using a recognized Solid reactive, lifecycle, or context API,
or calling another recognized hook. The analyzer follows symbols, relative imports,
re-exports, and the repository's `src/` alias within the selected hooks root. Helpers must
be reachable from its hooks or related context providers, including helpers in the same file.
Type declarations and barrel files may accompany the runtime code.

JSX components must return a provider proven to originate from `createContext`, and may not
contain ordinary UI markup. Provider names alone are insufficient. Type-only declarations,
tests, mocks, stories, and declaration files do not establish the presence of a production hook.

This is a static structural check, not a proof of runtime behavior or conceptual relevance.
Computed imports, external library hook implementations, arbitrary project aliases, and
rendering factories are not inferred. Keep such composition in a directly analyzable form.
The analyzer reads saved sibling files and the current file's lint source; unsaved sibling
buffers are unavailable. It does not cache analysis across runs, so deletions cannot leave
stale evidence of a hook. File moves and ownership choices have no automatic fix.

The rule uses Oxlint's [ESLint-compatible plugin API](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html).
Its folder graph is a custom TypeScript analysis, not Oxlint's native multi-file graph or
parser services. Each linted production file rebuilds that graph from the selected root;
large roots may be expensive. The current implementation is scoped to Pomo's hooks directory.
