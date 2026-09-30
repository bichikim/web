const SERVICE_DAYS_PATTERN = /^\d+$/u

export const isValidServiceDays = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0

export const parseServiceDays = (value: string): number | null => {
  const normalizedValue = value.replace(/[０-９]/gu, (digit) => digit.normalize('NFKC'))
  if (!SERVICE_DAYS_PATTERN.test(normalizedValue)) {
    return null
  }
  const numericValue = Number(normalizedValue)
  return isValidServiceDays(numericValue) ? numericValue : null
}

export const normalizeServiceDays = (value: string): string =>
  value === '' || parseServiceDays(value) !== null ? value : ''
