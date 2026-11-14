export const readArray = (value: unknown): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error('Expected an array in fixture data')
  }
  return value
}
