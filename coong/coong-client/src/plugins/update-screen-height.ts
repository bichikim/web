import {getDocument, getWindow} from '@winter-love/utils'
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
  const document = getDocument()
  if (!document) {
    return
  }
  // todo fix scroll
  window.addEventListener('DOMContentLoaded', () => {
    const {clientHeight, style} = document.documentElement

    style.setProperty(SCREEN_HEIGHT_PROPERTY, `${clientHeight}px`)
  })

  window.addEventListener('resize', () => {
    const {clientHeight, style} = document.documentElement
    style.setProperty(SCREEN_HEIGHT_PROPERTY, `${clientHeight}px`)
  })
}
