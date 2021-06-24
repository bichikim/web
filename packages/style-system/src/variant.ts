import {StyleParse} from 'src/types'
import {CSSObject} from '@emotion/css'
import {system} from './system'

export interface VariantOptions {
  prop: string
  scale?: string
  variants?: Record<string, CSSObject>
}

const deepParse = (style: Record<string, any>, parse, theme) => {
  const {deeps, left} = Object.keys(style).reduce((result, key) => {
    const value = style[key]
    if (typeof value === 'object' && !Array.isArray(value)) {
      result.deeps[key] = parse({...value, theme})
      return result
    }
    result.left[key] = value
    return result
  }, {deeps: {}, left: {}})

  return {
    ...parse({...left, theme}),
    ...deeps,
  }
}

export const createVariant = (parse: StyleParse) => (options: VariantOptions) => {
  const {prop, scale, variants} = options
  return system({
    [prop]: Object.assign((value: any, scale: any, props: any) => {
      const {theme} = props
      const style = scale?.[value]
      return typeof style === 'object' ? deepParse(style, parse, theme) : {}
    }, {
      defaults: variants,
      scale,
    }),
  })
}
