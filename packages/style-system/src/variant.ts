import {StyleParse} from 'src/types'
import {CSSObject} from '@emotion/css'
import {system} from './system'

export interface VariantOptions {
  prop: string
  scale?: string
  variants?: Record<string, CSSObject>
}

export const createVariant = (parse: StyleParse) => (options: VariantOptions) => {
  const {prop, scale, variants} = options
  return system({
    [prop]: Object.assign((value: any, scale: any, props: any) => {
      const {theme} = props
      const style = scale?.[value]
      return typeof style === 'object' ? parse({...style, theme}) : {}
    }, {
      defaults: variants,
      scale,
    }),
  })
}
