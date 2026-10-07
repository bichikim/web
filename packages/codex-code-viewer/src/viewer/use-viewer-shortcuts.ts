import {onCleanup} from 'solid-js'

interface ViewerShortcutsOptions {
  onSearch: () => void
  onMove: (direction: -1 | 1) => void
  onDismiss: () => void
  onFind?: () => void
}

export const useViewerShortcuts = (options: ViewerShortcutsOptions): void => {
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    if (event.key === 'Escape') {
      options.onDismiss()
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault()
      options.onSearch()
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'f' &&
      options.onFind !== undefined
    ) {
      event.preventDefault()
      options.onFind()
    }
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      options.onMove(-1)
    }
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault()
      options.onMove(1)
    }
  }
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('keydown', handleKeyboard)
    onCleanup(() => globalThis.removeEventListener('keydown', handleKeyboard))
  }
}
