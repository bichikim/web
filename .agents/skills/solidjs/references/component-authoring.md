# Component Authoring

## Files

- Component files use `PascalCase.tsx` and match the exported public component name.
- Keep one public component per component file.
- Do not use a `.client` suffix; filenames do not create client-only runtime boundaries.
- Do not name component files after helper, adapter, wrapper, or implementation roles.
- Prefix styled components with `S`, headless components with `H`, and generic/base components with no prefix.
- Use kebab-case for component directories and Solid custom hooks; write hooks as `.ts` files.
- Use descriptive sub-component suffixes such as `Provider`, `Root`, `Content`, `Item`, or `Overlay`.
- Name stories `<ComponentName>.story.tsx` and tests `<ComponentName>.spec.tsx`.

## Structure and variants

- Define `cva` outside the component and always set `defaultVariants`.
- Infer variant props with `VariantProps<typeof …Classes>`.
- Do not destructure props; use `splitProps` only when needed.
- Create local state with `createSignal` in the component body.

```tsx
import {type JSX, splitProps} from 'solid-js'
import {cva, type VariantProps} from 'class-variance-authority'

const buttonClasses = cva('outline-0 p-0', {
  defaultVariants: {size: 'md'},
  variants: {size: {md: 'text-md', sm: 'text-sm'}},
})

export interface ButtonProps extends VariantProps<typeof buttonClasses> {
  children?: JSX.Element
  class?: string
}

export const Button = (props: ButtonProps) => {
  const [innerProps, restProps] = splitProps(props, ['class', 'children', 'size'])
  return (
    <button {...restProps} class={buttonClasses({class: innerProps.class, size: innerProps.size})}>
      {innerProps.children}
    </button>
  )
}
```

## Initial props

Do not infer React's controlled/uncontrolled contract from `value`, `defaultValue`, `onInput`, or `onChange`. Treat values, native properties, and event callbacks independently unless the component explicitly relates them.

Preserve `defaultValue` when it is a native platform or existing API term. For a project prop read once to seed local state, prefer an `initial*` name and read it with `untrack`.

```tsx
const initialCount = untrack(() => props.initialCount ?? 0)
const [count, setCount] = createSignal(initialCount)
```

## Names

- Props type: `<ComponentName>Props`; prefer optional props.
- Children prop: `children?: JSX.Element`.
- Signal setter: `set` prefix, such as `count` / `setCount`.
- Internal event handler: `handle` prefix. Public cross-boundary callback: `on*`.
- Name event parameters `event`, not `e`.

## Empty signal values

For `createSignal` state, prefer `null` over `undefined` for an intentional empty value. When both empty string and absence are valid, use `string | null` and keep `''` distinct from `null`.

Pass a getter to conditional rendering: `<Show when={message}>`, not `<Show when={message()}>`.

## Classes

Solid JSX types `class` as `string | undefined`; do not pass an array. Use `cx` from `class-variance-authority` to merge string fragments or conditionals, `cva` for variant APIs, and `classList` for toggled classes. If `class` and `classList` are both reactive, prefer one styling path to avoid overwrite races.
