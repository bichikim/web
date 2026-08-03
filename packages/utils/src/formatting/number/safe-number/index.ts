export const safeNumber = (value: number, failValue: number = 0) => {
  if (Number.isNaN(value)) {
    return failValue
  }

  return value
}

/**
 * @deprecated Use `safeNumber` instead
 */
export const noNaN = safeNumber

/**
 * @deprecated Use `safeNumber` instead
 */
export const numberTo = safeNumber
