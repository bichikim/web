import {createStyled} from '@winter-love/stitches'
import {Plugin} from 'vue'

const {createDirective, styled, ...stitches} = createStyled({
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
})

export const createStitchesPlugin = (): {plugin: Plugin; stitches: any} => {
  const directive = createDirective()

  return {
    plugin: (app) => {
      app.directive('stitches', directive)
    },
    stitches,
  }
}

export {styled}
