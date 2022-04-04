const UNSAFE_CHARS_REGEXP = /[<>/\u2028\u2029]/ug
const ESCAPED_CHARS = {
  '/': '\\u002F',
  '<': '\\u003C',
  '>': '\\u003E',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}
const escape = (unsafeChar: string) => {
  return ESCAPED_CHARS[unsafeChar as keyof typeof ESCAPED_CHARS]
}
/**
 * @deprecated
 * @param value
 */
export const patchSafeString = (value: string): string => {
  return value.replace(
    UNSAFE_CHARS_REGEXP,
    escape,
  )
}
