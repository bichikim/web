/**
 * Creates a monotonic numeric identifier generator scoped to this factory instance.
 */
export const createMonotonicId = (startFrom = 0) => {
  if (!Number.isSafeInteger(startFrom) || startFrom < 0) {
    throw new RangeError('startFrom must be a non-negative safe integer')
  }

  let identifier = startFrom

  return () => {
    if (identifier === Number.MAX_SAFE_INTEGER) {
      throw new RangeError('identifier range exhausted')
    }

    identifier += 1

    return identifier
  }
}

/** @deprecated Use `createMonotonicId` instead. */
export const createUuid = createMonotonicId
