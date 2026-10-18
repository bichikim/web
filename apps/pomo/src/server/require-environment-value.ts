/** Returns a trimmed environment value or throws when it is not set. */
export const requireEnvironmentValue = (name: string, value: string | undefined): string => {
  const normalized = value?.trim()
  if (normalized === undefined || normalized.length === 0) {
    throw new TypeError(`${name} is not set`)
  }

  return normalized
}
