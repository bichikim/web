/** Reads plain SDK drawing and store data without treating unknown payloads as typed objects. */
export const readField = (value: unknown, ...path: readonly (string | number)[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      typeof current === 'object' && current !== null ? Reflect.get(current, key) : undefined,
    value,
  )
