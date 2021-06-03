export const drop = (array: any[]) => {
  const value = [...array]
  value.shift()
  return value
}
