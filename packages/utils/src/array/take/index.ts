export const take = <T>(list: T[], size: number = 1) => {
  return list.slice(0, size)
}

export interface TakeRight {
  (size?: number): <T>(list: T[]) => T[]
  <T>(size: number, list: T[]): T[]
}

export const takeRight: TakeRight = (...args: any[]): any => {
  const [size, list] = args

  if (args.length > 1) {
    return take(list, size)
  }

  return (list) => {
    return take(list, size)
  }
}
