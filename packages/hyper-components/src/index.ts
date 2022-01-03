import {Quasar, QuasarPluginOptions} from 'quasar'
import {createStyled} from '@winter-love/stitches'
import {Plugin} from 'vue'
import {EmptyObject} from '@winter-love/utils'
import {typography} from './variants'

import {ConfigType, CreateStitches} from '@stitches/core/types/config'
export type stitchesOptions = Parameters<CreateStitches>[0]
// eslint-disable-next-line unicorn/prefer-export-from
export {EmptyObject}

export type FunctionComposer = (...args) => any

export interface CreateHyperComponentsOptions {
  quasar?: QuasarPluginOptions
  theme?: ConfigType.Theme
  variants: Record<string, any>
}

export const createHyperComponents = (options: CreateHyperComponentsOptions) => {
  const {theme, variants} = options
  const {createDirective, ...restStitches} = createStyled({
    theme,
  })
  const directive = createDirective({
    variants: {
      typography,
      ...variants,
    },
  })

  const plugin: Plugin = (app) => {
    app.use(Quasar)
    app.directive('css', directive)
  }

  return {
    ...restStitches,
    plugin,
  }
}
