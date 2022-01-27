import {createHyperComponents} from '@winter-love/hyper-components'
import {Plugin} from 'vue'
export {createStyled} from '@winter-love/stitches'

const {plugin: _plugin, ...stitches} = createHyperComponents({
  variants: {},
})

const plugin: Plugin = (app) => {
  app.use(_plugin)
}
export default plugin

const {css, styled, globalCss, keyframes, className} = stitches

export {stitches, css, styled, globalCss, keyframes, className}
