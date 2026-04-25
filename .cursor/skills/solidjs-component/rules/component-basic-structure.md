# Basic Structure

```tsx
import {type JSX, splitProps, type ValidComponent} from 'solid-js'
import {cva, VariantProps} from 'class-variance-authority'

/**
 * Define cva outside the component to avoid recreating it on each render.
 * Use cva when styling depends on prop variants.
 */
const buttonClasses = cva('outline-0 p-0', {
  /**
   * Always set defaultVariants; undefined values won't apply classes.
   */
  defaultVariants: {
    size: 'md',
  },

  variants: {
    size: {
      /**
       * Size variants: 'md' and 'sm' are valid values for the size prop.
       */
      md: 'text-md',
      /**
       * Uses UnoCSS utility classes for styling.
       */
      sm: 'text-sm',
    },
  },
})

/**
 * Use VariantProps to infer prop types from the cva variants.
 */
export interface ButtonProps extends VariantProps<typeof buttonClasses> {
  children?: JSX.Element
  class?: string
}

export const Button = (props: ButtonProps) => {
  /**
   * Don't destructure props into plain JS objects; it breaks reactivity.
   * Use splitProps (or access props directly) to maintain reactivity.
   */
  const [innerProps, restProps] = splitProps(props, ['class', 'children', 'size'])

  return (
    <button {...restProps} class={buttonClasses({class: innerProps.class, size: innerProps.size})}>
      {innerProps.children}
    </button>
  )
}
```
