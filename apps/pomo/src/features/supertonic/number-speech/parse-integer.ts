/** Parses a signed integer while preserving leading-zero identifiers. */
export const parseInteger = (value: string): bigint | null => {
  const digits = value.replace(/^[+-]/u, '').replaceAll(',', '')

  if (digits.length > 1 && digits.startsWith('0')) {
    return null
  }

  try {
    return BigInt(digits)
  } catch {
    return null
  }
}
