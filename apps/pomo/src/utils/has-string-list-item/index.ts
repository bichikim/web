import {stringToStringList} from '../string-to-string-list'

/** Returns whether a comma-separated string contains the expected item after trimming each item. */
export const hasStringListItem = (values: string, expected: string): boolean =>
  stringToStringList(values).includes(expected)
