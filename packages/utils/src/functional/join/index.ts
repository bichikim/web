const _join = Array.prototype.join

export const join = <T>(list: T[], separator?: string): string => _join.call(list, separator)

export const joinFn =
  (separator: string) =>
  <T>(list: T[]): string =>
    join(list, separator)
