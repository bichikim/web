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

## Declarative DOM ownership

Return reactive state from hooks and bind it in JSX. Do not mirror signal state into DOM attributes or properties with `createEffect`, `setAttribute`, or direct assignment. Keep ref-based code for capabilities JSX cannot express, such as third-party lifecycle events, focus, measurement, or imperative APIs.

```tsx
const renderer = useRenderer()

return <external-viewer ref={renderer.attachElement} src={renderer.modelUrl()} />
```
