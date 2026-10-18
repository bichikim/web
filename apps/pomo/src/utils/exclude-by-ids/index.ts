/** 선택한 ID의 항목을 제외하고 순서, 중복, 객체 참조를 유지한다. */
export const excludeByIds = <Item, Id>(
  items: ReadonlyArray<Item>,
  ids: ReadonlyArray<Id>,
  getId: (item: Item) => Id,
): ReadonlyArray<Item> => {
  const excluded = new Set(ids)
  return items.filter((item) => !excluded.has(getId(item)))
}
