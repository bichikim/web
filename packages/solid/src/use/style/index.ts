export type ValidStyle = string | Record<string, any> | undefined

export const objectStyleToString = (style: Record<string, any>) => {
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value};`)
    .join('')
}

export const sx = (...args: ValidStyle[]) => {
  return args
    .map((arg) => {
      if (arg === undefined) {
        return ''
      }
      if (typeof arg === 'string') {
        return arg
      }
      return objectStyleToString(arg)
    })
    .join('')
}

/**
 * c
 */

export {cx} from 'class-variance-authority'
