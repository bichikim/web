import {createHyperComponents} from '@winter-love/hyper-components'
import {Plugin} from 'vue'
import {boot} from 'quasar/wrappers'

const {plugin: _plugin, ...stitches} = createHyperComponents({
  variants: {},
})

const plugin: Plugin = (app) => {
  app.use(_plugin)
}

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
