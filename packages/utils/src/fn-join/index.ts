import {join} from 'src/join'

export const fnJoin =
  (separator?: string) =>
  <T>(list: T[]): string =>
    join(list, separator)
