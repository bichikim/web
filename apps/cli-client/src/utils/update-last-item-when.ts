import {last} from 'es-toolkit'

import {updateLastItem} from '@/utils/update-last-item'

export const updateLastItemWhen = <Item>(
  items: Item[],
  predicate: (item: Item) => boolean,
  update: (item: Item) => Item,
): Item[] => {
  const tail = last(items)

  if (tail === undefined || !predicate(tail)) {
    return items
  }

  return updateLastItem(items, update)
}
