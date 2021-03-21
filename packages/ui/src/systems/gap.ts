import css, {CssFunctionReturnType} from '@styled-system/css'
import {ResponsiveValue} from 'styled-system'
import {PureObject} from '@/types'

type ValueAble = number | string | null | undefined

const getMinusValue = (value?: ValueAble | null) => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return value * -1
  }
  return value
}

const getMinusResponsiveValue = (
  value: ResponsiveValue<ValueAble>,
) => {
  if (Array.isArray(value)) {
    return value.map((element) => getMinusValue(element))
  }

  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((result, key) => {
      const item = value[key]
      result[key] = getMinusValue(item)
      return result
    }, {})
  }

  return getMinusValue(value as any)
}

export interface GapProps {
  gap?: ResponsiveValue<ValueAble>
  /**
   * todo
   * @default between
   */
  gapStrategy?: ResponsiveValue<'between' | 'around'>
}

export const getTheme = (
  props: PureObject,
  scale?: ValueAble,
  defaultValue?: ValueAble,
): ValueAble => {
  if (scale === null || typeof scale === 'undefined') {
    return scale
  }

  const {space} = props?.theme || {}

  const value = space?.[scale]

  if (typeof value === 'undefined') {
    return typeof defaultValue === 'undefined' ? scale : defaultValue
  }

  return value
}

export const getResponsiveTheme = (
  props: PureObject,
  scale: ResponsiveValue<ValueAble>,
  defaultValue?: ValueAble,
): ValueAble[] | Record<string, ValueAble> | ValueAble => {
  if (Array.isArray(scale)) {
    return scale.map((item) => getTheme(props, item, defaultValue))
  }

  if (typeof scale === 'object' && scale !== null) {
    return Object.keys(scale).reduce((result, key) => {
      const item = scale[key]
      result[key] = getTheme(props, item, defaultValue)
      return result
    }, {})
  }

  return getTheme(props, scale as any, defaultValue)
}

export const createGap = (height?: string) => {
  return (props: Record<string, any>): ReturnType<typeof gap> => (gap(props, height))
}

export const gap = (props: PureObject, height?: string): CssFunctionReturnType => {
  const {gap} = props

  const sizeGap = getResponsiveTheme(props, gap)

  const oppositeGap = getMinusResponsiveValue(sizeGap)

  const style = {
    '>*': {
      paddingLeft: gap,
      paddingTop: gap,

    },
    height: height ? `calc(${height} + ${sizeGap}px)` : undefined,
    marginLeft: oppositeGap,
    marginTop: oppositeGap,
  }

  return css(style)
}
