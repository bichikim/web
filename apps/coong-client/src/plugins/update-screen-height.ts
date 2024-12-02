//
const SCREEN_HEIGHT_PROPERTY = '--screen-height'

export const updateScreenHeight = () => {
  // globalBodySize()
  const {window} = globalThis
  if (!window) {
    return
  }
  const {document} = globalThis
  document.body.style.height = `var(${SCREEN_HEIGHT_PROPERTY}, 100vh)`
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
