import {PureObject} from '@winter-love/utils'
import mergeDeep from 'merge-deep'
import {createMediaQuery} from './create-media-query'
import {isCssProperties} from './css-properties'
import {CssPropertyKeys, PropsWithTheme} from './types'

export interface StyleFunctionContext<Theme extends PureObject> {
  aliasValue: Record<string, any>
  props?: PropsWithTheme<Theme>
  scale: Record<string, any>
  value: unknown
}

export type StyleFunction<Theme extends PureObject> = (context: StyleFunctionContext<Theme>) =>
  PureObject | string | number | undefined

export interface StyleFunctionRunner<Theme extends PureObject> {
  (
    value: any,
    props: PropsWithTheme<Theme>,
    aliasKey?: string | number,
  ): PureObject | string | number | undefined
  priority: number
}

export interface ShardStyleOptions<Theme extends PureObject> {
  alias?: string[]
  defaultScale?: Record<string, any>
  priority?: number
  scale?: string
  transform?: StyleFunction<Theme>
}

export type StyleFunctionOptions<Theme extends PureObject> = ShardStyleOptions<Theme>

export interface StyleOptions<Theme extends PureObject> extends ShardStyleOptions<Theme> {
  properties?: CssPropertyKeys[]
  property?: CssPropertyKeys
}

export interface MixinStyleOptions<Theme extends PureObject> extends StyleFunctionOptions<Theme>, StyleOptions<Theme> {
}

export type SystemOptions<Theme extends PureObject> =
  Record<CssPropertyKeys | string, StyleOptions<Theme> | StyleFunctionOptions<Theme> | boolean>

export type StyleSystemFunction<Theme extends PureObject> = {
  (props: PropsWithTheme<Theme>): PureObject
  allowCssProp: boolean
  systemFunctions: Partial<Record<string, StyleFunctionRunner<Theme>[]>>
}

export const getScale = <Theme extends PureObject>(theme: Theme, scale: string | undefined) => {
  if (!scale) {
    return
  }
  return theme[scale]
}

export const getValueFromScale = (
  scale: Record<string | number, any> | undefined,
  value: string | number | undefined,
) => {
  if (!value) {
    return value
  }

  if (!scale) {
    return value
  }
  return scale[value] ?? value
}

export const normalizeStyleOptions = <Theme extends PureObject>(
  options: MixinStyleOptions<Theme> | true,
  key: string,
) => {
  const _options: MixinStyleOptions<Theme> = options === true ? {properties: [key as any]} : options

  const {
    defaultScale = {},
    scale,
    alias = [],
    priority,
    properties,
    property,
  } = _options

  const _properties = properties ? properties : (property && [property])

  const {
    transform = ({value, scale}) => {
      const _scale = {...defaultScale, ...scale}
      const style = getValueFromScale(_scale, String(value))
      if (_properties) {
        return _properties.reduce((result, property) => {
          result[property] = style
          return result
        }, {})
      }
      return style
    },
  } = _options

  return {
    alias,
    defaultScale,
    priority,
    scale,
    transform,
  }
}

export const createStyleFunctionRunner = <Theme extends PureObject>(
  options: StyleOptions<Theme> | StyleFunctionOptions<Theme> | true,
  key: string,
): StyleFunctionRunner<Theme> => {
  const {defaultScale, scale, alias, priority = -1, transform} = normalizeStyleOptions(options, key)

  return Object.assign(
    (value: any, props: PropsWithTheme<Theme>, aliasKey: number | string = 0) => {
      const {theme = {}} = props
      const scaleRecode = getScale(theme, scale) ?? {}
      const aliasValue = alias.reduce((result, key) => {
        const prop = props[key]
        if (typeof prop === 'object') {
          const aliasValue = prop[aliasKey]
          if (aliasValue) {
            result[key] = prop[aliasKey]
          }
        }
        return result
      }, {})

      return transform({
        aliasValue,
        props,
        scale: {...defaultScale, ...scaleRecode},
        value,
      })
    },
    {
      priority,
    },
  )
}

interface GetStyleOptions<Theme extends PureObject> {
  aliasKey?: number
  key: string
  prop: any
  props: PropsWithTheme<Theme>
  styleFunctions: StyleFunctionRunner<Theme>[]
}

const getStyle = <Theme extends PureObject>(options: GetStyleOptions<Theme>) => {
  const {aliasKey, key, styleFunctions, props, prop} = options
  return styleFunctions.reduce((result, styleFunction) => {
    const style = styleFunction(prop, props, aliasKey)
    if (typeof style === 'object') {
      Object.assign(result, style)
    } else {
      Object.assign(result, {
        [key]: style,
      })
    }
    return result
  }, {})
}

export const createStyleSystemFunction = <Theme extends PureObject>(
  systemFunctions: Record<string, StyleFunctionRunner<Theme>[]>,
  allowCssProp: boolean = true,
) => {

  let _breakPoints: Record<string | number, string>
  return Object.assign((props: PropsWithTheme<Theme>) => {
    if (!_breakPoints) {
      const {theme: {breakpoints} = {} as Record<string, any>} = props
      if (breakpoints) {
        _breakPoints = Object.keys(breakpoints).reduce((result, key: string | number) => {
          const value = breakpoints[key]
          result[key] = createMediaQuery(value)
          return result
        }, {})
      } else {
        _breakPoints = {}
      }
    }

    return Object.keys(props).reduce((result, key) => {
      const prop = props[key]
      if (!systemFunctions[key]) {
        if (allowCssProp && isCssProperties(key)) {
          Object.assign(result, {[key]: prop})
        }
        return result
      }

      const styleFunctions: StyleFunctionRunner<Theme>[] | undefined = systemFunctions[key]
      if (!styleFunctions) {
        return result
      }

      if (Array.isArray(prop)) {
        return mergeDeep(result, prop.reduce((result, _prop, _key) => {
          const style = getStyle({aliasKey: _key, key, prop: _prop, props, styleFunctions})
          const media = _breakPoints[_key - 1]
          if (!media) {
            Object.assign(result, style)
            return result
          }
          Object.assign(result, {
            [_breakPoints[_key - 1]]: style,
          })
          return result
        }, {}))
      }

      return mergeDeep(result, getStyle({key, prop, props, styleFunctions}))
    }, {})
  }, {
    allowCssProp,
    systemFunctions,
  })
}

export const system = <Theme extends PureObject>(
  options: SystemOptions<Theme>,
  allowCssProp: boolean = true,
): StyleSystemFunction<Theme> => {
  // prepare system functions
  const systemFunctions: Record<string, StyleFunctionRunner<Theme>[]> =
    Object.keys(options).reduce((
      result: Record<string, StyleFunctionRunner<Theme>[]>,
      key,
    ) => {
      const option = options[key]

      if (!option) {
        return result
      }

      const systemFunctionList: StyleFunctionRunner<Theme>[] = result[key] ?? []

      systemFunctionList.push(createStyleFunctionRunner(option, key))

      result[key] = systemFunctionList
      return result
    }, {})

  return createStyleSystemFunction(systemFunctions, allowCssProp)
}
