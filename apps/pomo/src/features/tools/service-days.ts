const SERVICE_DAYS_PATTERN = /^\d+$/u

export const isValidServiceDays = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0

export const parseServiceDays = (value: string): number | null => {
  if (!SERVICE_DAYS_PATTERN.test(value)) {
    return null
  }
  const numericValue = Number(value)
  return isValidServiceDays(numericValue) ? numericValue : null
}

export const normalizeServiceDays = (value: string): string =>
  value === '' || parseServiceDays(value) !== null ? value : ''
