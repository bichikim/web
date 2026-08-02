# Basic Structure

- Define `cva` outside the component; always set `defaultVariants`.
- Infer variant props with `VariantProps<typeof …Classes>`.
- Do not destructure props; use `splitProps` only when needed — see ./reactivity-notes.md.
- Local state: `createSignal` in the component body (see ./component-initial-prop.md for `initial*` + `untrack`).

```tsx
import {type JSX, splitProps} from 'solid-js'
import {cva, type VariantProps} from 'class-variance-authority'

const buttonClasses = cva('outline-0 p-0', {
  defaultVariants: {
    size: 'md',
  },
  variants: {
    size: {
      md: 'text-md',
      sm: 'text-sm',
    },
  },
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
