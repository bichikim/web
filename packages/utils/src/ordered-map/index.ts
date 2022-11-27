import {getIndexedMap} from 'src/get-indexed-map'

/**
 * todo not yet done
 */
class OrderedMap<Item extends Record<any, any>> {
  readonly #list: Item[] = []
  readonly #indexMaps = new Map<string, Map<string, Item>>()
  readonly #listIndexMap = new Map<Item, number>()

  constructor(list: Item[]) {
    this.#list = [...list]
  }

  indexOf(key: number) {
    return this.#list[key]
  }

  sort(logic?: any) {
    this.#list.sort(logic)

    return this.#list
  }

  map() {
    //
  }

  #getIndexMap(path: string[]) {
    const pathId = path.join('.')
    const indexMap = this.#indexMaps.get(pathId)

    if (indexMap) {
      return indexMap
    }

    const newIndexMap = getIndexedMap(this.#list, path)
    this.#indexMaps.set(pathId, newIndexMap)

    return newIndexMap
  }

  #updateListMap() {
    this.#list.forEach((item, index) => {
      this.#listIndexMap.set(item, index)
    })
  }

  #getListIndexMap() {
    if (this.#listIndexMap.size > 0) {
      return this.#listIndexMap
    }

    this.#updateListMap()
    return this.#listIndexMap
  }

  get(path: string[], value: any) {
    const indexMap = this.#getIndexMap(path)

    return indexMap.get(value)
  }

  getIndex(item: Item) {
    return this.#getListIndexMap().get(item)
  }

  set(path: string[], value: any) {
    const indexMap = this.#getIndexMap(path)
  }
}
