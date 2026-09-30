/** Parses ASCII or fullwidth signed integers while preserving leading-zero identifiers. */
export const parseInteger = (value: string): bigint | null => {
  const integer = value
    .replace(/[０-９]/gu, (digit) => digit.normalize('NFKC'))
    .replace(/^−/u, '-')
    .replaceAll(',', '')
  const digits = integer.replace(/^[+-]/u, '')

  if (digits.length > 1 && digits.startsWith('0')) {
    return null
  }

  try {
    return BigInt(integer)
  } catch {
    return null
  }
}
