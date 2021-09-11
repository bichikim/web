import {Plugin} from 'vue'
import {createDirective} from '@winter-love/stitches'
import {createStitches} from '@stitches/core'

export const createStitchesPlugin = (): {plugin: Plugin; stitches: any} => {

  const stitches = createStitches({
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

  // does not work type check too complex stitches type
  const directive = createDirective(stitches as any)

  return {
    plugin: (app) => {
      app.directive('stitches', directive)
    },
    stitches,
  }
}
