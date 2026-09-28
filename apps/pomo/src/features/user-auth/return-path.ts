export const getSafeReturnTo = (value: string | null | undefined): string | null => {
  if (
    value === null ||
    value === undefined ||
    value.length === 0 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return null
  }

  return value
}
