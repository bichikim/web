import {stringToList} from '../string-to-list'
import {filter, map, pipe} from 'es-toolkit/fp'

export const stringToStringList = (values: string): string[] =>
  pipe(
    stringToList(values),
    map((value) => value.trim()),
    filter((value) => value.length > 0),
  )
