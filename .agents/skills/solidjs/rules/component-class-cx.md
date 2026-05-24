# `class` composition and `cx`

## Why not pass an array directly to JSX `class`?

In Solid JSX, the DOM `class` prop is typed as **`string | undefined`**. Passing multiple chunks as an array (e.g. `class={[a, b]}`) does not match the types or this repo’s conventions.

## Use `cx` in this repo

When you build a long `class` from several string fragments, or merge conditional / dynamic classes into one attribute, use **`cx`** from **`class-variance-authority`**. (`cx` is the same API as `clsx` under the hood.)

- If a line gets too long, split **`cx` arguments across multiple lines** (helps with Oxlint `max-len`).
- Use **`cva`** from the same package when you need a variant API; for simple merging and conditionals, **`cx`** alone is often enough.

```tsx
import {cx} from 'class-variance-authority'

const panelClass = cx(
  ':uno: fixed m-0 w-56 rounded-3 border-0 bg-white p-1',
  'text-left shadow-[0_12px_30px_rgba(17,18,22,0.14)] ring-1 ring-black/8',
)

const merged = cx(panelClass, props.class, isActive() && 'active')
```

## `classList` vs `cx`

- To **toggle classes on and off**, Solid’s **`classList={{ 'class-name': condition }}`** is efficient.
- To **merge several string fragments into one `class` string**, use **`cx`** as above.

If both `class` and `classList` are reactive, update order can cause overwrite issues; follow Solid’s docs and decide whether to keep styling in one place or split responsibilities clearly.
