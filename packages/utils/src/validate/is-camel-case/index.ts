const camelCaseRegex = /^[a-z]+[A-Z0-9]*[a-z][A-Za-z0-9]*$/u

export const isCamelCase = (value: string): boolean => {
  return camelCaseRegex.test(value)
}
