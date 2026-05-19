# Event callbacks vs readonly accessors

Use the `on` prefix only for **event-style callbacks** — values the parent or consumer **calls** to react to something.

Do **not** use `on` for **readonly reactive reads** — accessors that only **read** current state.

Applies to **component props**, **hook return values**, and **hook options** passed across boundaries.

## `on*` — event callbacks

Name with `on` + PascalCase event (`onHide`, `onSignOut`, `onAnchorRectChange`).

- Parent or consumer invokes them; they are not DOM attributes.
- Type as `() => void`, `() => Promise<void>`, or `(payload) => void` as needed.
- In JSX, pass as `onHide={menu.onHide}` or `onHide={() => ...}`.

```tsx
interface AccountMenuPanelProps {
  onHide: () => void
  onSignOut: () => Promise<void>
}

export interface SelectMenuController {
  onHide: () => void
  onPanelToggle: () => void
}
```

```tsx
// BAD — reads like imperative command, not an event callback
interface AccountMenuPanelProps {
  hide: () => void
}
```

## Readonly accessors — no `on` prefix

Expose reactive reads as `Accessor<T>` or `() => value`. Call sites use `props.isOpen()`, `menu.left()`, not `onIsOpen`.

```tsx
export interface SelectMenuController {
  isOpen: Accessor<boolean>
  left: Accessor<number>
  top: Accessor<number>
}
```

```tsx
// BAD — `on` implies a callback, not a read
export interface SelectMenuController {
  onIsOpen: Accessor<boolean>
}
```

## Local handlers inside a component or hook

Use `handle` + event name for **internal** DOM or local wiring (`handleTriggerClick`, `handleToggle`).

Reserve `on*` for **public** props, hook options, and hook return fields consumed outside the module.

```tsx
const handleTriggerClick = (event: MouseEvent & {currentTarget: HTMLButtonElement}) => {
  if (panelElement()?.matches(':popover-open')) {
    onHide()
    return
  }

  openFromTrigger(event.currentTarget)
}

return {
  handleTriggerClick,
  onHide,
  isOpen,
}
```

## Quick check

| Role                       | Naming            | Example                                 |
| -------------------------- | ----------------- | --------------------------------------- |
| Cross-boundary callback    | `on*`             | `onHide`, `onAnchorRectChange`          |
| Readonly reactive value    | accessor, no `on` | `isOpen`, `left: () => position().left` |
| Internal DOM/local handler | `handle*`         | `handleTriggerClick`                    |
| Framework DOM attribute    | keep DOM name     | `onClick`, `onToggle`                   |

Before naming a public field, ask: **is this invoked as an event, or only read for display/state?** Callback → `on*`; read → accessor without `on`.
