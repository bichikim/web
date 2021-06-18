import {StyleFunction} from './types'
import {PureObject} from '@winter-love/utils'

export const parseResponsiveStyle = (mediaQueries: string, sx: StyleFunction, scale: PureObject | undefined, raw: any[], _props: PureObject) => {
  const styles: any = {}
  raw.slice(0, mediaQueries.length).forEach((value: string, index: number) => {
    const media = mediaQueries[index]
    const style = sx(value, scale, _props, index)
    if (!media) {
      Object.assign(styles, style)
    } else {
      Object.assign(styles, {
        [media]: Object.assign({}, styles[media], style),
      })
    }
  })
  return styles
}
