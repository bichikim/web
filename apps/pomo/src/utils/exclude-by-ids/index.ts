/** Excludes items by selected IDs while preserving order, duplicates, and identities. */
export const excludeByIds = <Item, Id>(
  items: ReadonlyArray<Item>,
  ids: ReadonlyArray<Id>,
  getId: (item: Item) => Id,
): ReadonlyArray<Item> => {
  const excluded = new Set(ids)
  return items.filter((item) => !excluded.has(getId(item)))
}
