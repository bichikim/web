import {createParser, get} from '@styled-system/core'
import css from '@styled-system/css'
import getProperty from 'lodash/get'
import {VariantArgs} from 'styled-system'

export type Getter = (value: any, props: Record<string, any>) => string | string[]

export interface VariantComplexOptions {
  /**
   * @default: false
   */
  deepTheme?: boolean
  getter?: string | Getter | string[]
  transform?: (value, scale: Record<string, any>, props) => Record<string, any>
}

export const beFlatScale = (
  value: Record<string, any>,
  props,
): Record<string, any> => {
  const {theme} = props
  if (typeof theme !== 'object' || !value) {
    return value
  }
  return Object.entries(value).reduce((result, [key, value]) => {
    if (theme[key]) {
      Object.assign(result, get(theme[key], value) ?? {})
    } else {
      result[key] = value
    }
    return result
  }, {})
}

export const getStyleByNamespace = (value: any, namespace: string | string[]) => {
  if (typeof value === 'object') {
    return getProperty(value, namespace)
  }
  return {}
}

const getNamespace = (getter: string | string[] | Getter | undefined, value, props) => {
  if (typeof getter === 'function') {
    return getter(value, props)
  }
  return getter ?? value
}

/**
 * variant with a theme properties
 * @param options
 */
export const variantComplex = <TStyle = Record<string, any>,
  K extends string = string,
  >(options: VariantArgs<TStyle, K> & VariantComplexOptions) => {
  const {
    variants = {}, prop = 'variant',
    key, scale = key, deepTheme, getter, transform,
  } = options
  const systemFunc =
    (value, scale, props) => {
      const _namespace = getNamespace(getter, value, props)
      const namespacedScale = getStyleByNamespace(scale, _namespace) || {}
      const transformedScale = transform ? transform(value, namespacedScale, props) : namespacedScale
      const flatScale = deepTheme ? beFlatScale(transformedScale, props) : transformedScale
      return css(flatScale)(props.theme)
    }
  Object.assign(systemFunc, {
    defaults: variants,
    scale,
  })
  return createParser({
    [prop]: systemFunc,
  })
}
