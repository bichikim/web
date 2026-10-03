import {batch, createSignal} from 'solid-js'

import type {OffsetList, ReplaceOffsetPageOptions, UseOffsetListProps} from './types'

/** Accumulates keyed rows while tracking offsets from raw server page lengths. */
export const useOffsetList = <Item, Key>(
  props: UseOffsetListProps<Item, Key>,
): OffsetList<Item, Key> => {
  const [items, setItems] = createSignal<ReadonlyArray<Item>>([])
  const [nextOffset, setNextOffset] = createSignal(0)
  const uniqueItems = (rows: ReadonlyArray<Item>): ReadonlyArray<Item> => {
    const keys = new Set<Key>()
    return rows.filter((item) => {
      const key = props.getKey(item)
      if (keys.has(key)) {
        return false
      }
      keys.add(key)
      return true
    })
  }
  const appendPage = (page: ReadonlyArray<Item>): void => {
    batch(() => {
      setItems((current) => uniqueItems([...current, ...page]))
      setNextOffset((offset) => offset + page.length)
    })
  }
  const replacePage = (page: ReadonlyArray<Item>, options: ReplaceOffsetPageOptions = {}): void => {
    batch(() => {
      setItems((current) => uniqueItems(options.retainItems ? [...page, ...current] : page))
      setNextOffset(page.length)
    })
  }
  const updateItem = (key: Key, update: (item: Item) => Item): void => {
    setItems((current) => current.map((item) => (props.getKey(item) === key ? update(item) : item)))
  }
  return {
    appendPage,
    items,
    nextOffset,
    replacePage,
    reset: () => replacePage([]),
    updateItem,
  }
}
