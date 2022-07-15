export const times = <T>(times: number, callback: (index: number) => T): T[] => {
  return Array(times)
    .fill(null)
    .map((_, index) => callback(index))
}
