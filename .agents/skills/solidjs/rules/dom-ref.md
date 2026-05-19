# DOM Refs

**Default:** use `createSignal` plus `ref={setElement}` for DOM handles. This matches the repo and satisfies Oxlint `no-unassigned-vars` through explicit assignment.

```tsx
import {createSignal} from 'solid-js'

function Example() {
  const [el, setEl] = createSignal<HTMLDivElement | undefined>()
  const handleClick = () => el()?.focus()

  return <div ref={setEl} onClick={handleClick} />
}
```

Keep refs inside the component and lift only the values and events the parent needs. Do not pass the DOM through a `ref` prop; pass what the parent needs through callbacks at the appropriate time, such as click or toggle.
