import type {Plugin} from 'vite'

const UNO_CSS_PREFIX = '/__uno'
const UNO_CSS_SUFFIX = '.css'

const isUnoCssInlineId = (source: string): boolean => {
  const queryIndex = source.indexOf('?')

  if (queryIndex === -1) {
    return false
  }

  const pathname = source.slice(0, queryIndex)
  const query = source.slice(queryIndex + 1)
  const isBaseStylesheet = pathname === `${UNO_CSS_PREFIX}${UNO_CSS_SUFFIX}`
  const isGeneratedStylesheet =
    pathname.startsWith(`${UNO_CSS_PREFIX}_`) &&
    pathname.endsWith(UNO_CSS_SUFFIX) &&
    pathname.length > UNO_CSS_PREFIX.length + UNO_CSS_SUFFIX.length + 1

  return (
    (isBaseStylesheet || isGeneratedStylesheet) &&
    (query === 'inline' || query.startsWith('inline&'))
  )
}

/** Resolve UnoCSS inline virtual styles as virtual Vite modules. */
export const createUnoCssInlineResolver = (): Plugin => ({
  enforce: 'pre',
  name: 'unocss-inline-virtual-id',
  resolveId(source) {
    if (isUnoCssInlineId(source)) {
      return `\0${source}`
    }
  },
})
