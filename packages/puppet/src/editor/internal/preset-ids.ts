/** First `${prefix} N` (N ≥ 1) not in `ids`. */
export const createUniqueName = (prefix: string, ids: Iterable<string>) => {
  const taken = new Set(ids)
  const index = Array.from({length: taken.size + 1}, (_, offset) => offset + 1).find(
    (candidate) => !taken.has(`${prefix} ${candidate}`),
  )!
  return `${prefix} ${index}`
}

/** Trimmed `name` when it is non-empty and unused by another entry; otherwise undefined. */
export const acceptName = (name: string, currentId: string, ids: Iterable<string>) => {
  const trimmed = name.trim()
  const taken = new Set(ids)
  return trimmed.length === 0 || (trimmed !== currentId && taken.has(trimmed)) ? undefined : trimmed
}
