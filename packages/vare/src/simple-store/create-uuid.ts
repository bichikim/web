export const createUuid = (prefix?: string) => {
  let count = 0
  return () => {
    count += 1
    return `${prefix}-${count}`
  }
}
