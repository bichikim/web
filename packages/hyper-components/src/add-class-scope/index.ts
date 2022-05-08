import {omit} from '@winter-love/lodash'
import {entries, fromEntries} from '@winter-love/utils'

export const addClassScope = (css?: Record<string, any>, classScope?: string) => {
  if (!classScope || !css) {
    return css
  }

  const baseCss = entries(css).filter(([key]) => !key.startsWith('&'))

  const newCss = omit(css, baseCss.map(([key]) => key))

  newCss[`&${classScope}`] = fromEntries(baseCss)

  return newCss
}
