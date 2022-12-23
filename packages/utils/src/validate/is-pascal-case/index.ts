const pascalCaseRegex = /^[A-Z]+[A-Z0-9]*[a-z][A-Za-z0-9]*$/u

export const isPascalCase = (value: string): boolean => {
  return pascalCaseRegex.test(value)
}
