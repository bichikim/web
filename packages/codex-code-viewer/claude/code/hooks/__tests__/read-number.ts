export const readNumber = (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number in fixture data')
  }
  return value
}
