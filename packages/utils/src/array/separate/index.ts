export const separate = <TargetItem, FilteredItem = TargetItem>(
  list: TargetItem[],
  filter: (item: TargetItem) => boolean,
): [FilteredItem[], TargetItem[]] => {
  const leftList: TargetItem[] = []
  const filteredList: any[] = []
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
export const separateOp = <FilteredItem, TargetItem = any>(
  filter: (item: TargetItem) => boolean,
) => {
  return (list: TargetItem[]) => {
    return separate<TargetItem, FilteredItem>(list, filter)
  }
}
