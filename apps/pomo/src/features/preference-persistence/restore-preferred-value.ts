export interface RestorePreferredValueOptions<Value> {
  readonly preferred: Value | null
  readonly repair: (value: Value) => Promise<unknown>
  readonly restore: () => Promise<Value>
}

/** Repairs replicas before returning a preferred value, or restores an absent value. */
export const restorePreferredValue = async <Value>(
  options: RestorePreferredValueOptions<Value>,
): Promise<Value> => {
  const {preferred} = options
  if (preferred === null) {
    return options.restore()
  }
  await options.repair(preferred)
  return preferred
}
