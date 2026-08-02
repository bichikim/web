# Component variable name

Solid-specific naming (general abbreviations / case rules: typescript skill).

- Props type: `<ComponentName>Props`; prefer optional props.
- Children prop: `children?: JSX.Element`.
- Signal setter: `set` prefix (`count` / `setCount`).
- Internal event handlers: `handle` prefix (`handleClick`). Public cross-boundary callbacks: `on*` — see ./component-event-callback-naming.md.
- Do not name the event parameter `e`; use `event`.

```tsx
export interface AwesomeButtonProps {
  children?: JSX.Element
  multiply?: number
  size?: 'sm' | 'md' | 'lg'
}

export const AwesomeButton = (props: AwesomeButtonProps) => {
  const [count, setCount] = createSignal(0)

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    event.preventDefault()
    setCount((value) => value + 1)
  }

  const multipliedCount = () => count() * (props.multiply ?? 1)

  return (
    <button onClick={handleClick}>
      {props.children} {multipliedCount()}
    </button>
  )
}
```

For `cva` / variants, see ./component-basic-structure.md.
