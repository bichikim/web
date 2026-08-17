import type {Plugin} from 'vite'

const UNO_CSS_INLINE_ID = /^\/__uno(?:_.+)?\.css\?inline(?:&.*)?$/u

/** Resolve UnoCSS inline virtual styles as virtual Vite modules. */
export const createUnoCssInlineResolver = (): Plugin => ({
  enforce: 'pre',
  name: 'unocss-inline-virtual-id',
  resolveId(source) {
    if (UNO_CSS_INLINE_ID.test(source)) {
      return `\0${source}`
    }
  },
})
