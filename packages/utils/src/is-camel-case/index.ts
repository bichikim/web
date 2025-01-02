const camelCaseRegex = /^[a-z]+[A-Z0-9]*[a-z][A-Za-z0-9]*$/u
const MAX_STRING = 300

export const isCamelCase = (value: string): boolean => {
  return camelCaseRegex.test(value.slice(0, MAX_STRING))
}
