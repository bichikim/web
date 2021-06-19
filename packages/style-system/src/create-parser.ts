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
  const cache: any = {}
  const parse: StyleParse & Record<any, any> = (props: Record<string, any>) => {
    // let styles = {}
    let shouldSort = false
    const isCacheDisabled = props.theme && props.theme.disableStyledSystemCache

    const theme = props.theme

    const styles = Object.keys(props).reduce((result, key) => {
      const value = key
      if (!config[value]) {
        return result
      }
      const sx = config[value]
      const raw = props[value]
      const scale = getScale(theme, sx.scale, sx.defaults)

      if (typeof raw === 'object') {
        cache.breakpoints =
          (!isCacheDisabled && cache.breakpoints) ||
          getScale(props.theme, 'breakpoints', defaults.breakpoints)

        if (Array.isArray(raw)) {
          cache.media = (!isCacheDisabled && cache.media) || [
            // eslint-disable-next-line unicorn/no-null
            null,
            // eslint-disable-next-line unicorn/no-array-callback-reference
            ...cache.breakpoints.map((size) => createMediaQuery(size)),
          ]
          return mergeStyle(result, parseResponsiveStyle(cache.media, sx, scale, raw, props))
        }

        if(raw !== null) {
          shouldSort = true
          return mergeStyle(
            result,
            parseResponsiveObject(cache.breakpoints, sx, scale, raw, props),
          )
        }
        return result
      }

      return Object.assign(result, sx(raw, scale, props))
    }, {})

    // sort object-based responsive styles
    if (shouldSort) {
      return sortStyle(styles)
    }

    return styles
  }
  parse.config = config
  parse.propNames = Object.keys(config)
  parse.cache = cache

  const keys = Object.keys(config).filter(k => k !== 'config')

  if (keys.length > 1) {
    const parses = keys.reduce((result, key) => {
      result[key] = createParser({[key]: config[key]})
      return result
    }, {})
    return Object.assign(parse, parses)
  }

  return parse
}