export const clone = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return [...value] as any
  }
  if (typeof value === 'object') {
    return {...value}
  }
  return value
}
