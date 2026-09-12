/** Returns whether a comma-separated string contains the expected item after trimming each item. */
export const hasStringListItem = (values: string, expected: string): boolean =>
  values.split(',').some((value) => value.trim() === expected)
