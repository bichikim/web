
export const times = <T>(times: number, callback: (index: number) => T) => {
  return Array.of(times).map((_, index) => callback(index))
}
