export const take = (size: number = 1) => <T>(list: T[]): T[] => {
  return list.slice(0, size)
}
