export type ChangeType = 'added' | 'deleted' | 'moved' | 'updated' | 'equal'
export interface ArrayChange<T = unknown> {
  type: ChangeType
  value: T
  oldIndex: number | null
  newIndex: number | null
  indexDiff: number | null
}

export const diffLoop = <T>(oldMap: Map<string, T>, newArray: T[], getKey: (item: T) => string) => {
  const changes: ArrayChange<T>[] = []
  const processedIds = new Set<string>()

  const newMap = new Map<string, ArrayChange<T>>(newArray.map((value, index) => [getKey(value), {value, type: 'added', oldIndex: null, newIndex: index, indexDiff: null}]))

  for (let index = 0; index < newArray.length; index += 1) {
    const item = newArray[index]
    const key = getKey(item)
    const oldItem = oldMap.get(key)

    processedIds.add(key)

    if(oldItem) {
      // 이미 있는 아이템
    }
  }
}
