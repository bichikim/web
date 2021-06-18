import {ObjectOrArray, StyleFunction} from './types'
import {PureObject} from '@winter-love/utils'
import {createMediaQuery} from './create-media-query'

export const parseResponsiveObject = (breakpoints: ObjectOrArray<any>, sx: StyleFunction, scale: PureObject | undefined, raw: PureObject, _props: any) => {
  const styles: any = {}
  for (const key in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      continue
    }
    const breakpoint = breakpoints[key]
    const value = raw[key]
    const style = sx(value, scale, _props)
    if (!breakpoint) {
      Object.assign(styles, style)
    } else {
      const media = createMediaQuery(breakpoint)
      Object.assign(styles, {
        [media]: Object.assign({}, styles[media], style),
      })
    }
  }
  return styles
}
