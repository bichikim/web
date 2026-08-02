export const separate = <TargetItem, FilteredItem = TargetItem>(
  list: TargetItem[],
  filter: (item: TargetItem | FilteredItem) => item is FilteredItem,
): [FilteredItem[], TargetItem[]] => {
  const leftList: TargetItem[] = []
  const filteredList: FilteredItem[] = []

  for (const item of list) {
    if (filter(item)) {
      filteredList.push(item)
    } else {
      leftList.push(item)
    }
  }

  return [filteredList, leftList]
}

/**
 * todo fix this
 * @param filter
 */
export const separateOp = <FilteredItem, TargetItem = unknown>(
  filter: (item: TargetItem | FilteredItem) => item is FilteredItem,
) => {
  return (list: TargetItem[]) => {
    return separate<TargetItem, FilteredItem>(list, filter)
  }
}
