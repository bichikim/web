/** Reports whether every id is distinct without normalizing its spelling. */
export const hasUniqueIds = (ids: ReadonlyArray<string>): boolean =>
  new Set(ids).size === ids.length
