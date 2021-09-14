/**
 * drops one item from an array
 */
export const drop = (array: any[]) => {
  const value = [...array]
  value.shift()
  return value
}
