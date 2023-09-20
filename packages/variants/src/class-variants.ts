export type Base = string | string[]

export type variants = Record<string, Record<string, any>>
export interface Config {
  variants?: variants
}

export type Props = Record<string, any>

export const toStringValue = (value: any) => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return value
}

export const classVariants = (base: Base, config: Config) => {
  const {variants = {}} = config

  return (props) => {
    const list = Object.entries(props).map(([key, value]) => {
      const variant = variants[key]
      if (typeof variant === 'function') {
        return variant(value)
      }
      return variant[toStringValue(value)]
    })
  }
}

export const cv = classVariants
