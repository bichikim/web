import {parseCommaSeparated} from '../parse-comma-separated'

/** Returns whether a comma-separated string contains the expected item after trimming each item. */
export const hasStringListItem = (values: string, expected: string): boolean =>
  parseCommaSeparated(values).includes(expected)
