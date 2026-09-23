/** Returns whether a value is a non-null, non-array object. */
export const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
