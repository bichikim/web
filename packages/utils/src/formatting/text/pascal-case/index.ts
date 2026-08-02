import {camelCase} from 'es-toolkit/string'

export const pascalCase = (value: string) => {
  const newValue = camelCase(value)

  return `${newValue.charAt(0).toUpperCase()}${newValue.slice(1)}`
}
