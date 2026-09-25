export const readErrorProperty = (value: object, property: string): unknown => {
  try {
    return Reflect.get(value, property)
  } catch {
    return undefined
  }
}
