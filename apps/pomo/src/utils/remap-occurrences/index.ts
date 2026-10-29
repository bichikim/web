export interface RemapOccurrencesOptions<Value> {
  /** Keys aligned with values; repeated keys retain their source order. */
  readonly sourceKeys: ReadonlyArray<string>
  /** Keys in the requested output order; each consumes the next matching value. */
  readonly targetKeys: ReadonlyArray<string>
  /** Values aligned with sourceKeys; undefined or missing values are skipped, and extra values ignored. */
  readonly values: ReadonlyArray<Value>
}

/** Matches values by key occurrence without mutating inputs; missing or exhausted matches are undefined. */
export const remapOccurrences = <Value>(
  options: RemapOccurrencesOptions<Value>,
): ReadonlyArray<Value | undefined> => {
  const valuesByKey = new Map<string, Value[]>()
  options.sourceKeys.forEach((key, index) => {
    const value = options.values[index]
    if (value !== undefined) {
      const values = valuesByKey.get(key) ?? []
      values.push(value)
      valuesByKey.set(key, values)
    }
  })
  return options.targetKeys.map((key) => valuesByKey.get(key)?.shift())
}
