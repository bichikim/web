
export const nanNumber = (value: string | number, defaultValue: number = 0): number => {
  const mayNumber = Number(value)
  if (Number.isNaN(mayNumber)) {
    return defaultValue
  }
  return mayNumber
}
