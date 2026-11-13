import {onCleanup} from 'solid-js'

interface UseViewerShortcutsProps {
  onSearch: () => void
  onMove: (direction: -1 | 1) => void
  onDismiss: () => void
  onFind?: () => void
  onSave?: () => void
}

export const useViewerShortcuts = (props: UseViewerShortcutsProps): void => {
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing || event.defaultPrevented) {
      return
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 's' &&
      props.onSave !== undefined
    ) {
      event.preventDefault()
      props.onSave()
    }
    if (event.key === 'Escape') {
      props.onDismiss()
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault()
      props.onSearch()
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'f' &&
      props.onFind !== undefined
    ) {
      event.preventDefault()
      props.onFind()
    }
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      props.onMove(-1)
    }
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault()
      props.onMove(1)
    }
  }
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('keydown', handleKeyboard)
    onCleanup(() => globalThis.removeEventListener('keydown', handleKeyboard))
  }
}
