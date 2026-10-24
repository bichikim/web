const camelCaseRegex = /^[a-z][A-Za-z0-9]*$/u
const MAX_STRING = 300

export const isCamelCase = (value: string): boolean => {
  return value.length <= MAX_STRING && camelCaseRegex.test(value)
}
