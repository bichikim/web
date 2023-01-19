export const last = <T>(list: T[]): T | undefined => {
  const {length} = list
  if (length === 0) {
    return
  }
  return list[length - 1]
}
