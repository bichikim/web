import {createMediaQuery} from './create-media-query'
import {getScale} from './get-scale'
import {mergeStyle} from './marge-style'
import {parseResponsiveObject} from './parse-responsive-object'
import {parseResponsiveStyle} from './parse-responsive-style'
import {sortStyle} from './sort-style'
import {StyleFunction, StyleParse} from './types'

export const SM_BREAKPOINT = 40
export const MD_BREAKPOINT = 52
export const LG_BREAKPOINT = 64
export const DEFAULT_BREAK_POINTS = [SM_BREAKPOINT, MD_BREAKPOINT, LG_BREAKPOINT]

export const defaults = {
  breakpoints: DEFAULT_BREAK_POINTS.map(n => n + 'em'),
}

export const createParser = (config: Record<string, StyleFunction>) => {
  const _config = {...config}
  const cache: any = {}
  const parse: StyleParse & Record<any, any> = (props: Record<string, any>) => {
    let styles = {}
    let shouldSort = false
    const isCacheDisabled = props.theme && props.theme.disableStyledSystemCache

    for (const key in props) {
      if (!Object.prototype.hasOwnProperty.call(props, key) || !_config[key]) {
        continue
      }
      const sx = _config[key]
      const raw = props[key]
      const scale = getScale(props.theme, sx.scale, sx.defaults)

      if (typeof raw === 'object') {
        cache.breakpoints =
          (!isCacheDisabled && cache.breakpoints) ||
          getScale(props.theme, 'breakpoints', defaults.breakpoints)
        if (Array.isArray(raw)) {
          cache.media = (!isCacheDisabled && cache.media) || [
            null,
            ...cache.breakpoints.map(createMediaQuery),
          ]
          styles = mergeStyle(
            styles,
            parseResponsiveStyle(cache.media, sx, scale, raw, props),
          )
          continue
        }
        if (raw !== null) {
          styles = mergeStyle(
            styles,
            parseResponsiveObject(cache.breakpoints, sx, scale, raw, props),
          )
          shouldSort = true
        }
        continue
      }

      Object.assign(styles, sx(raw, scale, props))
    }

    // sort object-based responsive styles
    if (shouldSort) {
      styles = sortStyle(styles)
    }

    return styles
  }
  parse.config = _config
  parse.propNames = Object.keys(_config)
  parse.cache = cache

  const keys = Object.keys(_config).filter(k => k !== 'config')
  if (keys.length > 1) {
    keys.forEach(key => {
      parse[key] = createParser({[key]: _config[key]})
    })
  }

  return parse
}
