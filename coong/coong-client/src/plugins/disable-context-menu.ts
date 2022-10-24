import {getWindow} from '@winter-love/utils'

export const disableContextMenu = () => {
  const window = getWindow()
  if (!window) {
    return
  }
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    event.stopPropagation()
    return false
  })
}
