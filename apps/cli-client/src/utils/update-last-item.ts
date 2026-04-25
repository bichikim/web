import {last} from 'es-toolkit'

export const updateLastItem = <Item>(items: Item[], update: (item: Item) => Item): Item[] => {
  const tail = last(items)

  if (tail === undefined) {
    return items
  }

  const next = [...items]
  const lastIndex = next.length - 1
  next[lastIndex] = update(tail)

  return next
}
