# Component variable name

```tsx
import {createSignal, type JSX, splitProps, type ValidComponent} from 'solid-js'
import {cva, VariantProps} from 'class-variance-authority'

/**
 * Define component Props as <ComponentName>Props
 */
export interface AwesomeButtonProps {
  /**
   * Define component children as children
   */
  children?: JSX.Element
  multiply?: number
  /**
   * Define component Props as optional as much as possible
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Use cva and unoCSS for component styles. defaultVariants must be defined.
 */
const buttonClasses = cva('outline-0 p-0', {
  defaultVariants: {
    size: 'md',
  },
  variants: {
    size: {
      // Known style abbreviations are allowed
      lg: 'text-lg',
      md: 'text-md',
      sm: 'text-sm',
    },
  },
})

/**
 * Use PascalCase for variable names
 */
export const AwesomeButton = (props: AwesomeButtonProps) => {
  // Use 'set' prefix for names that set count
  const [count, setCount] = createSignal(0)

  /**
   * Use 'handle' prefix for event handling functions
   */
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    // Do not use 'e' for event, especially
    event.preventDefault()
    setCount((value) => value + 1)
  }

  /**
   * Do not use abbreviations for variable names
   */
  const multipliedCount = () => count() * (props.multiply ?? 1)

  return (
    <button onClick={handleClick} class={buttonClasses({size: props.size})}>
      {props.children} {multipliedCount()}
    </button>
  )
}
```
