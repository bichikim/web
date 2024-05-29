const UNSAFE_CHARS_REGEXP = /[<>/\u2028\u2029]/gu
const ESCAPED_CHARS = {
  '/': String.raw`\u002F`,
  '<': String.raw`\u003C`,
  '>': String.raw`\u003E`,
  '\u2028': String.raw`\u2028`,
  '\u2029': String.raw`\u2029`,
}
const escape = (unsafeChar: string) => {
  return ESCAPED_CHARS[unsafeChar as keyof typeof ESCAPED_CHARS]
}
/**
 * @deprecated
 * @param value
 */
export const patchSafeString = (value: string): string => {
  return value.replaceAll(UNSAFE_CHARS_REGEXP, escape)
}
