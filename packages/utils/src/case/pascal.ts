import {camelCase} from '@winter-love/lodash'

export const pascalCase = (value: string) => {
  const newValue = camelCase(value)
  return `${newValue.charAt(0).toUpperCase()}${newValue.slice(1)}`
}
