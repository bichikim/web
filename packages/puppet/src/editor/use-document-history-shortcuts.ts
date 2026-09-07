import {onCleanup, onMount} from 'solid-js'

type HistoryShortcut = 'redo' | 'undo'

interface UseDocumentHistoryShortcutsProps {
  readonly onRedo: () => boolean
  readonly onUndo: () => boolean
}

let activeOwner: symbol | null = null

const getHistoryShortcut = (event: KeyboardEvent): HistoryShortcut | undefined => {
  const editableTarget = event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches('input, select, textarea')),
    )
  if (editableTarget || event.altKey || (!event.ctrlKey && !event.metaKey)) {
    return undefined
  }

  const key = event.key.toLowerCase()
  if (key === 'z') {
    return event.shiftKey ? 'redo' : 'undo'
  }

  return key === 'y' && event.ctrlKey ? 'redo' : undefined
}

export const useDocumentHistoryShortcuts = (props: UseDocumentHistoryShortcutsProps) => {
  const owner = Symbol('document-history-shortcuts')

  onMount(() => {
    activeOwner ??= owner
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeOwner !== owner) {
        return
      }

      const shortcut = getHistoryShortcut(event)
      if (shortcut === undefined) {
        return
      }

      const changed = shortcut === 'undo' ? props.onUndo() : props.onRedo()
      if (changed) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    onCleanup(() => {
      if (activeOwner === owner) {
        activeOwner = null
      }
      window.removeEventListener('keydown', handleKeyDown)
    })
  })

  return () => {
    activeOwner = owner
  }
}
