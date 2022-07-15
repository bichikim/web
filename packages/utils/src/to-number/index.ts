export const toNumber = (value?: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' || typeof value === 'string') {
    const result = Number(value)
    return Number.isNaN(result) ? defaultValue : result
  }

  return defaultValue
}

/**
 * @deprecated
 */
export const nanNumber = toNumber
