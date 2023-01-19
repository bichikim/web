const _join = Array.prototype.join

export const join = <T>(list: T[], separator?: string): string => _join.call(list, separator)

export interface JoinOp {
  (separator?: string): <T>(list: T[]) => string

  <T>(separator: string, list: T[]): string
}

export const joinOp: JoinOp = (...args: any[]): any => {
  const [separator, list] = args
  if (args.length > 1) {
    return join(list, separator)
  }

  return (list) => {
    return join(list, separator)
  }
}
