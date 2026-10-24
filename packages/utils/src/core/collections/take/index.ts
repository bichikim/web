export const take = <T>(list: T[], size: number): T[] => {
  return list.slice(0, size)
}
