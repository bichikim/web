# Context DOM Exposure

Context must expose **the values consumers actually need**, not the DOM handles used to produce them.

Ask: _What will siblings read or use?_ Expose that. Keep the element private inside the owner.

Do not put raw DOM handles (`HTMLElement`, `SVGElement`, `ref` accessors) on context values. Consumers can call arbitrary DOM APIs (`focus`, `click`, attribute mutation) and break encapsulation.

## Rule

1. **Identify the consumer need** — positioning needs bounds, not an element; open state needs a boolean, not a trigger node.
2. **Derive inside the owner** — read `getBoundingClientRect`, measure, or query in the root/component that owns the ref.
3. **Expose plain data or actions** — `Rect`, `boolean`, `id`, `onOpen`, `onClose`. Never the live node unless the consumer truly must mutate that exact element (rare; prefer callbacks owned by the ref holder).

```tsx
// Bad — consumer gets a handle; may call focus(), click(), or read stale geometry
interface MenuContext {
  anchorElement: Accessor<HTMLElement | undefined>
}

// Good — consumer gets what it uses: viewport bounds for positioning
interface MenuContext {
  getAnchorBounds: () => Rect | undefined
  onClose: () => void
  onOpen: (element: HTMLElement) => void
  open: Accessor<boolean>
}
```

## Example: `HSelectRoot`

[`HSelectRoot`](../../../../apps/coong/src/components/select-menu-2/HSelectRoot.tsx) stores `anchorElement` internally. Context exposes `getAnchorBounds()` — the bounds positioning siblings need — via [`getBounds`](../../../../apps/coong/src/components/select-menu-2/get-bounds.ts):

```tsx
const getAnchorBounds = () => {
  const element = anchorElement()
  return element ? getBounds(element) : undefined
}
```

`Content` calls `getAnchorBounds()` when positioning; it never receives the trigger element.

## Acceptable context surface

| Need             | Expose                                       | Do not expose   |
| ---------------- | -------------------------------------------- | --------------- |
| Menu placement   | `getAnchorBounds(): Rect \| undefined`       | `anchorElement` |
| Open state       | `open: Accessor<boolean>`                    | trigger ref     |
| User opens menu  | `onOpen(element)` — one-way input at trigger | —               |
| User closes menu | `onClose()`                                  | —               |

`onOpen(element)` is an **input action** from the trigger into the root. Siblings that need geometry use `getAnchorBounds()`, not the element passed to `onOpen`.

See also ./dom-ref.md.
