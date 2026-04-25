# Control Flow

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
      {/* Use For for object references (keyed by object identity) */}
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
      {/* Use Index for primitives to avoid recreating DOM nodes when value changes but index stays same */}
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
