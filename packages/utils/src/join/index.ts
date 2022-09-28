export const join = <T>(list: T[], separator?: string): string =>
  Array.prototype.join.call(list, separator)
