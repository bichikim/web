export const removeItem = <T extends any[]>(
  value: T,
  predicate: (value: any, index: number, array: any[]) => unknown,
  clone: boolean = false,
) => {
  const clonedValue = clone ? [...value] : value
  const index = clonedValue.findIndex((...args) => predicate(...args))
  if (index === -1) {
    return clonedValue
  }
  clonedValue.splice(index, 1)
  return clonedValue
}
