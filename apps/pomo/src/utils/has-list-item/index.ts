import {hasStringListItem} from 'src/utils/has-string-list-item'

export const hasListItem = (values: unknown, expected: string): boolean => {
  if (typeof values === 'string') {
    return hasStringListItem(values, expected)
  }

  return (
    Array.isArray(values) &&
    values.every((value) => typeof value === 'string') &&
    values.includes(expected)
  )
}
