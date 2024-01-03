export const createDisableContextMenu = () => {
  const offListener = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (off: boolean) => {
    if (off) {
      window.addEventListener('contextmenu', offListener)
    } else {
      window.removeEventListener('contextmenu', offListener)
    }
  }
}
