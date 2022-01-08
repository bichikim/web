import {createStyled} from '@winter-love/stitches'
import {defineNuxtPlugin} from '#app'

const {createDirective, styled, css, globalCss, keyframes, ...stitches} = createStyled({
  media: {
    bp1: '(min-width: 640px)',
    bp2: '(min-width: 768px)',
    bp3: '(min-width: 1024px)',
  },
  theme: {
    colors: {
      red1: 'rgb(253,37,37)',
    },
  },
  utils: {
    bg: (value) => ({backgroundColor: value}),
    m: (value) => ({margin: value}),
    p: (value) => ({padding: value}),
  },
})

export {styled, css, globalCss, keyframes}

export default defineNuxtPlugin((nuxtApp) => {
  const directive = createDirective()
  const {ssrContext, vueApp} = nuxtApp
  vueApp.directive('css', directive)
  if (ssrContext) {
    ssrContext.renderMeta = () => {
      const headTags = `<style id="stitches">${stitches.getCssText()}</style>`
      return {
        headTags,
      }
    }
  }
})
