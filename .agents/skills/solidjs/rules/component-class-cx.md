# `class` composition and `cx`

Solid JSX types `class` as `string | undefined` — do not pass a class array.

When merging several string fragments or conditionals into one `class`, use **`cx`** from **`class-variance-authority`**. Split long `cx` argument lists across lines. Use **`cva`** for a variant API; see ./component-basic-structure.md.

```tsx
const merged = cx(panelClass, props.class, isActive() && 'active')
```

- Toggle classes: Solid `classList={{ 'class-name': condition }}`.
- Merge string fragments: `cx`.

If both `class` and `classList` are reactive, prefer one styling path to avoid overwrite races.
