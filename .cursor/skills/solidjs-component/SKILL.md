---
name: solidjs-component
description: Applies project conventions for Solid.js component structure, naming, state, and styling. Use when writing or editing .tsx component files.
---

# Solidjs Component

## File naming rules

See `rules/file-naming-rules.md`

## Component Structure

### Basic Structure and Styling

See `rules/component-basic-structure.md`

### Structure With createSignal State

See `rules/component-state-structure.md`

### Initial props with default values

See `rules/component-initial-prop.md`

### Component variable name rules

See `rules/component-variable-name.md`

### Optional / absent values in createSignal

See `rules/component-signal-empty-value.md`

### Multi-part `class` strings (`cx`)

See `rules/component-class-cx.md`

### DOM refs (`ref`)

**Default:** `createSignal` + `ref={setElement}` for DOM handles—matches this repo and satisfies Oxlint `no-unassigned-vars` (explicit assignment).

```tsx
import {createSignal} from 'solid-js'

function Example() {
  const [el, setEl] = createSignal<HTMLDivElement | undefined>()
  const handleClick = () => el()?.focus()

  return <div ref={setEl} onClick={handleClick} />
}
```

Keep refs inside the component and lift only the values and events the parent needs. Do not pass the DOM through a `ref` prop; pass what the parent needs through callbacks at the appropriate time (e.g. click, toggle).

### Event callbacks vs readonly accessors (`on*`)

See `rules/component-event-callback-naming.md`

### Conditional, switch, and list rendering

Use SolidJS built-in control-flow components from `solid-js` instead of ad-hoc `&&`, nested ternaries, or `.map()` when you need reactive branching or keyed lists:

- **Conditional rendering:** `<Show>` (`when`, optional `fallback`)
- **Switch rendering:** `<Switch>` with `<Match>` children (`when` per branch)
- **Repeated list rendering:** `<For>` (`each`, keyed item tracking)

## Solid Reactivity Notes

- Implement proper code splitting but never split Solidjs props
  - BAD (breaks reactivity by splitting props):

    ```tsx
    interface Props {
      count: number
    }

    export function Counter(props: Props) {
      const {count} = props
      return <div>{count}</div>
    }
    ```

  - GOOD (keep props reactive):

    ```tsx
    interface Props {
      count: number
    }

    export function Counter(props: Props) {
      return <div>{props.count}</div>
    }
    ```

  - If splitting is unavoidable, use Solid's `splitProps`:

    ```tsx
    import {splitProps} from 'solid-js'

    interface Props {
      count: number
      class?: string
    }

    export function Counter(props: Props) {
      const [local, rest] = splitProps(props, ['count', 'class'])
      return (
        <div class={local.class} {...rest}>
          {local.count}
        </div>
      )
    }
    ```

- In Solid, `createEffect` cleanup must use `onCleanup(() => ...)` inside the effect (do not `return` a cleanup function)
  - BAD (do not `return` a cleanup function):

    ```tsx
    import {createEffect} from 'solid-js'

    export function Example() {
      createEffect(() => {
        const id = window.setInterval(() => {}, 1000)
        return () => window.clearInterval(id)
      })

      return null
    }
    ```

  - GOOD (use `onCleanup` inside the effect):

    ```tsx
    import {createEffect, onCleanup} from 'solid-js'

    export function Example() {
      createEffect(() => {
        const id = window.setInterval(() => {}, 1000)
        onCleanup(() => window.clearInterval(id))
      })

      return null
    }
    ```

## Resources

- context7 mcp -> Use this MCP as the highest priority reference source.

official documentation links -> ./references/reference.md
