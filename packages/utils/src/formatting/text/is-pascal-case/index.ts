const pascalCaseRegex = /^[A-Z][A-Za-z0-9]*$/u
const MAX_STRING = 300

export const isPascalCase = (value: string): boolean => {
  return value.length <= MAX_STRING && pascalCaseRegex.test(value)
}
