export const readRecord = (value: unknown): Readonly<Record<string, unknown>> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object in fixture data')
  }
  return Object.fromEntries<unknown>(Object.entries(value))
}
