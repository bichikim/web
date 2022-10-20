export const disableContextMenu = () => {
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    event.stopPropagation()
    return false
  })
}
