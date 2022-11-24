import {getItem} from 'src/get-item'

export const getIndexedMap = <Item>(list: Item[], path: string[]) => {
  const newMap = new Map()

  for (const item of list) {
    const key = getItem(item, path)
    newMap.set(key, item)
  }

  return newMap
}
