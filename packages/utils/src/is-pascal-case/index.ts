const pascalCaseRegex = /^[A-Z]+[A-Z0-9]*[a-z][A-Za-z0-9]*$/u
const MAX_STRING = 300

export const isPascalCase = (value: string): boolean => {
  return pascalCaseRegex.test(value.slice(0, MAX_STRING))
}
