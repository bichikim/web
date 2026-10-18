import {filter, map, pipe} from 'es-toolkit/fp'

/** Splits on commas, trims items, and removes empty items. */
export const parseCommaSeparated = (values: string): string[] =>
  pipe(
    values.split(','),
    map((value) => value.trim()),
    filter((value) => value.length > 0),
  )
