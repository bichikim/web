export const safeToNumber = (value: string, failValue: number | null = null) => {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return failValue
  }

  return number
}
