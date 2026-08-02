# Context DOM Exposure

Expose **what consumers need**, not the DOM handles used to produce it. Keep elements private in the owner.

1. Identify the consumer need (bounds, open state, ids, actions).
2. Derive inside the owner (`getBoundingClientRect`, measure, query).
3. Expose plain data or actions (`Rect`, `boolean`, `onOpen`, `onClose`). Never put raw `HTMLElement` / `ref` accessors on context unless the consumer must mutate that exact node (rare).

```tsx
// Bad
interface MenuContext {
  anchorElement: Accessor<HTMLElement | undefined>
}

// Good
interface MenuContext {
  getAnchorBounds: () => Rect | undefined
  onClose: () => void
  onOpen: (element: HTMLElement) => void
  open: Accessor<boolean>
}
```

| Need           | Expose                                 | Do not expose   |
| -------------- | -------------------------------------- | --------------- |
| Menu placement | `getAnchorBounds(): Rect \| undefined` | `anchorElement` |
| Open state     | `open: Accessor<boolean>`              | trigger ref     |
| Open / close   | `onOpen(element)`, `onClose()`         | —               |

`onOpen(element)` is input into the root; siblings that need geometry use `getAnchorBounds()`, not the element. See ./dom-ref.md.
