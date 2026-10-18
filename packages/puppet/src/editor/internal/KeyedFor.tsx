import {type Accessor, createMemo, For, type JSX, untrack} from 'solid-js'

interface KeyedForProps<T> {
  readonly each: ReadonlyArray<T>
  readonly key: (item: T) => string
  readonly children: (item: Accessor<T>) => JSX.Element
}

export function KeyedFor<T>(props: KeyedForProps<T>) {
  const items = createMemo(() => new Map(props.each.map((item) => [props.key(item), item])))
  return (
    <For each={[...items().keys()]}>
      {(key) => {
        const initial = untrack(() => items().get(key)!)
        const item = createMemo(() => items().get(key) ?? initial)
        return <>{props.children(item)}</>
      }}
    </For>
  )
}
