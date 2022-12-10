export const disableContextMenu = () => {
  const window = globalThis.window
  if (!window) {
    return
  }
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    event.stopPropagation()
    return false
  })
}
