const isStringList = (values: unknown): values is readonly string[] =>
  Array.isArray(values) && values.every((value) => typeof value === 'string')

export const hasListItem = (values: unknown, expected: string): boolean => {
  if (typeof values === 'string') {
    return values.split(',').some((value) => value.trim() === expected)
  }

  return isStringList(values) && values.some((value) => value === expected)
}
