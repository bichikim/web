import {createEmotion} from '@winter-love/emotion'
import {theme} from 'src/theme'

export const emotion = createEmotion(theme)

const {
  styled, css, cache, flush, cx, injectGlobal, keyframes, merge, getRegisteredStyles, hydrate,
} = emotion

export {
  styled,
  css,
  cache,
  flush,
  cx,
  injectGlobal,
  keyframes,
  merge,
  getRegisteredStyles,
  hydrate,
}
