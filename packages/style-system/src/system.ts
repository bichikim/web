import {AnyObject, PureObject} from '@winter-love/utils'
import {Properties} from 'csstype'
import {createParser} from './create-parser'
import {CSSObject} from '@emotion/css'
import {StyleParse} from './types'

export interface ConfigStyle<Theme extends AnyObject, Scale extends string | number | symbol = keyof Theme> {
  /** A fallback scale object for when there isn't one defined in the `theme` object. */
  defaultScale?: Scale
  /**
   * An array of multiple properties (e.g. `['marginLeft', 'marginRight']`) to which this style's value will be
   * assigned (overrides `property` when present).
   */
  properties?: Array<keyof Properties>
  /** The CSS property to use in the returned style object (overridden by `properties` if present). */
  property?: keyof Properties
  /** A string referencing a key in the `theme` object. */
  scale?: Scale
  /** A function to transform the raw value based on the scale. */
  transform?: (value: keyof Theme[Scale], scale?: Theme[Scale], props?: PureObject) => any
}
import {getScale} from './get-scale'

const getValue = (n: any, scale: any) => getScale(scale, n, n)

export const createStyleFunction = <Theme extends AnyObject, Scale extends string | number | symbol = keyof Theme>(options: ConfigStyle<Theme, Scale>) => {
  const {defaultScale, properties, property, scale, transform = getValue} = options
  const _properties = properties || [property]
  const sx = (value: any, scale: any, _props: any) => {
    const result: any = {}
    const n = transform(value, scale, _props)
    if (n === null) {
      return
    }
    _properties.forEach((prop: any) => {
      result[prop] = n
    })
    return result
  }
  sx.scale = scale
  sx.defaults = defaultScale
  return sx
}

const fillProperty = <Theme extends AnyObject = AnyObject>(option: ConfigStyle<Theme>, key: string): ConfigStyle<Theme> => {
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

export interface SystemOptions<Theme extends PureObject = PureObject>{
  [customStyleName: string]: ConfigStyle<Theme> | boolean | ((value: any, scale: any, props: any, index: number) => CSSObject)
}

export const system = <Theme extends AnyObject>(options: SystemOptions<Theme> = {}): StyleParse => {
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
