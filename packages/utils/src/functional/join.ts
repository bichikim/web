export const join = <T>(list: T[], separator: string): string => list.join(separator)

export const joinFn =
  (separator: string) =>
  <T>(list: T[]): string =>
    join(list, separator)
