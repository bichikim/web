# forbidden-hooks

Keep hooks and reactive runtime dependencies out of selected directories:

```ts
'project/forbidden-hooks': ['error', ['utils/**/*']]
```

Patterns match at any directory depth, so this includes `apps/pomo/src/utils/example/logic.ts`.
An empty or omitted pattern list disables the rule. Register this package as the `project`
JavaScript plugin, or replace the prefix with its configured name.

The rule checks `useXxx` declarations, imports, re-exports and calls, imports from `hooks` directories,
and runtime imports from `solid-js` and its subpaths. Type-only imports and exports are allowed.
Literal dynamic imports and `require` calls from hook paths are also checked.
Import basenames such as `use-value.ts` are not used to classify hooks.
It does not trace arbitrary aliases or infer hook behavior across modules.

Use oxlint `overrides` to restrict application scope and explicitly exempt tests where needed.
The repository enables this rule for Pomo utilities. No automatic fix is provided because
moving a hook requires choosing its owner and updating imports.
