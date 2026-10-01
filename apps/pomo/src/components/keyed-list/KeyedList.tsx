import {type Accessor, createMemo, For, type JSX, untrack} from 'solid-js'

export interface KeyedListProps<Item extends object> {
  readonly each: ReadonlyArray<Item>
  readonly by: (item: Item) => string
  readonly children: (item: Accessor<Item>, index: Accessor<number>) => JSX.Element
}

/** Preserves each row by its unique key and supplies its current value reactively. */
export const KeyedList = <Item extends object>(props: KeyedListProps<Item>): JSX.Element => {
  const entries = createMemo(() => new Map(props.each.map((item) => [props.by(item), item])))
  return (
    <For each={Array.from(entries().keys())}>
      {(key, index) => {
        const initial = entries().get(key)!
        const item = createMemo<Item>((previous) => entries().get(key) ?? previous, initial)
        return untrack(() => props.children(item, index))
      }}
    </For>
  )
}
