export const readText = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error('Expected text in fixture data')
  }
  return value
}
