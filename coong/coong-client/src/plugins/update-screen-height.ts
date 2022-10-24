import {getWindow} from '@winter-love/utils'
import {globalCss} from '@winter-love/uni'

const SCREEN_HEIGHT_PROPERTY = '--screen-height'

const globalBodySize = globalCss({
  body: {
    height: `var(${SCREEN_HEIGHT_PROPERTY}, 100vh)`,
  },
})

export const updateScreenHeight = () => {
  globalBodySize()
  const window = getWindow()
  if (!window) {
    return
  }
  window.addEventListener('DOMContentLoaded', () => {
    const {innerHeight} = window

    document.documentElement.style.setProperty(SCREEN_HEIGHT_PROPERTY, `${innerHeight}px`)
  })

  window.addEventListener('resize', () => {
    const {innerHeight} = window
    document.documentElement.style.setProperty(SCREEN_HEIGHT_PROPERTY, `${innerHeight}px`)
  })
}
