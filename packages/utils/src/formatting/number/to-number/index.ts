export const toNumberOrUndefined = (value?: unknown): number | undefined => {
  if (typeof value === 'symbol') {
    return undefined
  }

  try {
    const number = Number(value)

    return Number.isNaN(number) ? undefined : number
  } catch {
    return undefined
  }
}

export const toNumber = (value?: unknown, failValue: number = 0): number => {
  const number = toNumberOrUndefined(value)

  return number ?? failValue
}
