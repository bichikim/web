# Basic Structure
```tsx
import {type JSX, splitProps, type ValidComponent} from 'solid-js'
import {cva} from 'class-variance-authority'

export interface ButtonProps {
  children?: JSX.Element
  class?: string
  size?: 'sm' | 'md' | 'lg'
}

// Define cva outside the component.
// Use cva when styling depends on prop variants.
const buttonClasses = cva('outline-0 p-0', {
  // Always set defaultVariants; undefined won't apply classes.
  defaultVariants: {
    size: 'md',
  },

  variants: {
    size: {
      md: 'text-md',
      // Use UnoCSS
      sm: 'text-sm',
    },
  },
})

export const Button = (props: ButtonProps) => {
  // Don't destructure props into plain JS objects; it breaks reactivity.
  // Use splitProps (or access props directly) as shown below.
  const [innerProps, restProps] = splitProps(props, ['class', 'children', 'size'])

  // Read props via props.size (or innerProps.size) to keep reactivity.
  // If createMemo features aren't needed, a function that reads signals stays reactive.
  // Avoid inline styles except for dynamic values
  const className = () => buttonClasses({class: innerProps.class, size: innerProps.size})

  return (
    <button {...restProps} class={className()}>
      {innerProps.children}
    </button>
  )
}

```

