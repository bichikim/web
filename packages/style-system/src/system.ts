import {AnyObject, PureObject} from '@winter-love/utils'
import {Properties} from 'csstype'
import {createParser} from './create-parser'
import {CSSObject} from '@emotion/css'
import {StyleParse} from './types'

export type NotUndefined<T> = T extends undefined ? never : T
export type PropertyKeys = NotUndefined<keyof Properties>

export interface ConfigStyle<Theme extends AnyObject, Scale extends string | number | symbol = keyof Theme> {
  /** A fallback scale object for when there isn't one defined in the `theme` object. */
  defaultScale?: Record<string, any>
  /**
   * An array of multiple properties (e.g. `['marginLeft', 'marginRight']`) to which this style's value will be
   * assigned (overrides `property` when present).
   */
  properties?: Array<PropertyKeys>
  /** The CSS property to use in the returned style object (overridden by `properties` if present). */
  property?: PropertyKeys

  /** A string referencing a key in the `theme` object. */
  scale?: Scale | string
  /** A function to transform the raw value based on the scale. */
  transform?: (value: keyof Theme[Scale], scale?: Theme[Scale], props?: PureObject) => any
}

import {getScale} from './get-scale'

const getValue = (key: any, scale: any) => getScale(scale, key, key)

export const createStyleFunction = <
  Theme extends AnyObject,
  Scale extends string | number | symbol = keyof Theme
  >(options: ConfigStyle<Theme, Scale>) => {
  const {
    defaultScale, properties, property, scale, transform = getValue,
  } = options
  const _properties = properties || [property]
  const sx = (value: any, scale: any, _props: any) => {
    const style = transform(value, scale, _props)
    if (style === null) {
      return
    }

    return Object.fromEntries(_properties.filter(Boolean).map((key) => [key, style]))
  }
  sx.scale = scale
  sx.defaults = defaultScale
  return sx
}

const fillProperty = <Theme extends AnyObject = AnyObject>(
  option: ConfigStyle<Theme>,
  key: string,
): ConfigStyle<Theme> => {
  const {property, properties, ...rest} = option
  let _properties: any[]
  if (property) {
    _properties = [property]
  } else if (properties) {
    _properties = [...properties]
  } else {
    _properties = [key]
  }
  return {
    ...rest,
    properties: _properties,
  }
}

export type SystemConfig<Theme> = ConfigStyle<Theme> | boolean
  | ((value: any, scale: any, props: any, index: number) => CSSObject)

export type SystemOptions<Theme extends PureObject = PureObject> =
  Record<PropertyKeys | string, SystemConfig<Theme>>

export const createSystemConfig = <Theme extends PureObject>(config: ConfigStyle<Theme>) =>
  (configNext: ConfigStyle<Theme> = {}) => {
    return {
      ...config,
      ...configNext,
    }
  }

export const system = <Theme extends AnyObject>(options: SystemOptions<Theme> = {} as any): StyleParse => {
  const _options = {...options}
  const config = Object.keys(_options).reduce((config: Record<string, any>, key: string) => {
    const option: any = options[key]

    if (option === true) {
      config[key] = createStyleFunction({
        property: key as any,
        scale: key,
      })
      return config
    }

    if (typeof option === 'function') {
      config[key] = option
      return config
    }

    config[key] = createStyleFunction(fillProperty(option, key))
    return config
  }, {} as any)

  return createParser(config)
}
