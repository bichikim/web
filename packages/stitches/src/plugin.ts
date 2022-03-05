import {Plugin} from 'vue'
import {createStyled} from './create-styled'

export interface PluginOptions {
  directiveName?: string
}

export const createStitchesPlugin = (config: Parameters<typeof createStyled>[0]): Plugin => {
  const {createDirective, ...stitches} = createStyled(config)

  return {
    ...stitches,
    install: (app, options: PluginOptions = {}) => {
      const {directiveName = 'css'} = options

      const directive = createDirective()

      app.directive(directiveName, directive as any)
    },
  }
}
