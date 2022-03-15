import {createHyperComponents} from '@winter-love/hyper-components'
import {boot} from 'quasar/wrappers'

const {plugin, ...stitches} = createHyperComponents({
  variants: {},
})

const {css, styled, globalCss, keyframes, className, csx} = stitches

export {stitches, css, styled, globalCss, keyframes, className, csx}

const reqStitchesKey = '__stitches__'
console.log('hoodoasdasdas')
export default boot(({app, ssrContext}: any) => {
  // plugin
  console.log('hyper', ssrContext)
  app.use(plugin)
  if (ssrContext) {
    ssrContext.req[reqStitchesKey] = stitches
  }
})
