/* eslint-disable max-params */
import {ObjectOrArray, StyleFunction} from './types'
import {PureObject} from '@winter-love/utils'
import {createMediaQuery} from './create-media-query'

export const parseResponsiveObject = (
  breakpoints: ObjectOrArray<any>,
  sx: StyleFunction,
  scale: PureObject | undefined,
  raw: PureObject,
  _props: any,
) => {
  return Object.keys(raw).reduce((result, key) => {
    const value = raw[key]
    const breakpoint = breakpoints[key]
    const style = sx(value, scale, _props, key)

    if (breakpoint) {
      const media = createMediaQuery(breakpoint)
      result[media] = {...result[media], ...style}
      return result
    }
    Object.assign(result, style)
    return result
  }, {})
}
