# Event callbacks vs readonly accessors

Use `on*` only for **event-style callbacks** the consumer **calls**. Do **not** use `on` for readonly reactive reads (`Accessor<T>` / `() => value`).

Applies to component props, hook return values, and hook options.

| Role                       | Naming            | Example                        |
| -------------------------- | ----------------- | ------------------------------ |
| Cross-boundary callback    | `on*`             | `onHide`, `onAnchorRectChange` |
| Readonly reactive value    | accessor, no `on` | `isOpen`, `left`               |
| Internal DOM/local handler | `handle*`         | `handleTriggerClick`           |
| Framework DOM attribute    | keep DOM name     | `onClick`, `onToggle`          |

```tsx
// Good
interface AccountMenuPanelProps {
  onHide: () => void
  onSignOut: () => Promise<void>
}

export interface SelectMenuController {
  onHide: () => void
  isOpen: Accessor<boolean>
  left: Accessor<number>
}

// Bad — `hide` reads like a command; `onIsOpen` looks like a callback
interface Bad {
  hide: () => void
  onIsOpen: Accessor<boolean>
}
```

Before naming a public field: **invoked as an event → `on*`; only read → accessor without `on`.**
