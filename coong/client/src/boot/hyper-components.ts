/* eslint-disable sort-keys-fix/sort-keys-fix */
import {createHyperComponents} from '@winter-love/hyper-components'
import {boot} from 'quasar/wrappers'

const {plugin, ...stitches} = createHyperComponents({
  variants: {},
})

const {css, styled, globalCss, keyframes, className, csx} = stitches

export {stitches, css, styled, globalCss, keyframes, className, csx}

const reqStitchesKey = '__stitches__'

const siteCss = globalCss({
  html: {
    fontSize: '16px',
    '@bp1': {
      fontSize: '16px',
    },
    '@bp2': {
      fontSize: '18pX',
    },
    '@bp3': {
      fontSize: '20px',
    },
  },
})

export default boot(({app, ssrContext}: any) => {
  // plugin
  app.use(plugin)
  if (ssrContext) {
    // passing stitches for render css to string
    ssrContext.req[reqStitchesKey] = stitches
  }
  siteCss()
})
