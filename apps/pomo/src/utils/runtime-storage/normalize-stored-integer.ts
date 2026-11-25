/** Recovers an integer serialized as decimal text. The consuming schema validates its range. */
export const normalizeStoredInteger = (value: unknown): unknown => {
  if (typeof value !== 'string' || !/^\d+$/u.test(value)) {
    return value
  }
  const integer = Number(value)
  return Number.isSafeInteger(integer) ? integer : value
}
