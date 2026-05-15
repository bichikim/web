# Control Flow

Use SolidJS built-in control-flow components from `solid-js` instead of ad-hoc `&&`, nested ternaries, or `.map()` when you need reactive branching or repeated rendering:

- Use `<Show>` for conditional rendering with an optional `fallback`.
- Use `<Switch>` with `<Match>` children for exclusive branches.
- Use `<For>` when each row is tracked by item identity, especially object lists where rows can be inserted, removed, or reordered.
- Use `<Index>` when each row is tracked by stable position, especially primitive value arrays where the value may change but the index remains the identity.

## For (keyed list iteration)

```tsx
import {createSignal, For} from 'solid-js'

interface Todo {
  id: number
  text: string
}

export const TodoList = () => {
  const [todos, setTodos] = createSignal<Todo[]>([
    {id: 2, text: 'Buy milk'},
    {id: 3, text: 'Buy bread'},
  ])

  return (
    <ul>
      {/* Use <For> because each todo object is the row identity. Reordering or inserting items should move the existing row with that object. */}
      <For each={todos()}>
        {(todo, index) => (
          <li>
            {todo.text} {index() + 1}
          </li>
        )}
      </For>
    </ul>
  )
}
```

## Index Non-keyed list iteration

```tsx
import {createSignal, Index} from 'solid-js'

export const TodoList = () => {
  const [todos, setTodos] = createSignal<string[]>(['Buy milk', 'Buy bread'])

  return (
    <ul>
      {/* Use <Index> because the array position is the row identity. The accessor reads the latest primitive value for that stable position. */}
      <Index each={todos()}>
        {(todo, index) => (
          <li>
            {todo()} {index + 1}
          </li>
        )}
      </Index>
    </ul>
  )
}
```
