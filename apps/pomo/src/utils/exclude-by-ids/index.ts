/** Excludes matching IDs while preserving item order, duplicates, and identities. */
export const excludeByIds = <Item extends {readonly id: string}>(
  items: ReadonlyArray<Item>,
  ids: ReadonlyArray<string>,
): ReadonlyArray<Item> => {
  const excluded = new Set(ids)
  return items.filter((item) => !excluded.has(item.id))
}
