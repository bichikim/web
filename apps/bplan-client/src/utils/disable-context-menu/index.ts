const offListener = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

export const createDisableContextMenu = () => {
  return (off: boolean) => {
    if (off) {
      window.addEventListener('contextmenu', offListener)
    } else {
      window.removeEventListener('contextmenu', offListener)
    }
  }
}
