/**
 * Returns a trimmed value or throws when it is absent.
 * @param {string | undefined} value
 * @param {string} name
 * @returns {string}
 */
export const requireValue = (value, name) => {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new TypeError(`${name} is required.`)
  }

  return normalizedValue
}
