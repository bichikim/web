import {StyleFunction} from './types'
import {PureObject} from '@winter-love/utils'

export const parseResponsiveStyle = (mediaQueries: string[], sx: StyleFunction, scale: PureObject | undefined, raw: any[], _props: PureObject) => {
  return raw.slice(0, mediaQueries.length).reduce((result, value: string, index: number) => {
    const media = mediaQueries[index]
    const style = sx(value, scale, _props, index)
    if (media) {
      result[media] = {...result[media], ...style}
      return result
    }
    Object.assign(result, style)
    return result
  }, {})
}
