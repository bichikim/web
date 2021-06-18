import {PureObject} from '@winter-love/utils'
import {getScale} from './get-scale'
import css from '@styled-system/css'
import {StyleFunction} from './types'
import {createParser} from './create-parser'

export interface variantOptions {
  key?: string
  prop: string
  scale?: string
  variants?: PureObject
}

export const variant = (options: variantOptions) => {
  const {
    scale,
    prop = 'variant',
    // enables new api
    variants = {},
    // shim for v4 API
    key,
  } = options
  let sx: StyleFunction
  if (Object.keys(variants).length > 0) {
    sx = (key: string, scale: PureObject | undefined, props: PureObject) => {
      return css(getScale(scale, key))(props.theme)
    }
  } else {
    sx = (key: string, scale: PureObject | undefined) => getScale(scale, key)
  }
  sx.scale = scale || key
  sx.defaults = variants
  const config = {
    [prop]: sx,
  }

  return createParser(config)
}
