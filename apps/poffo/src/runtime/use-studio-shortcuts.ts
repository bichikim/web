import {type Accessor, onCleanup} from 'solid-js'
interface UseStudioShortcutsProps {
  readonly enabled: Accessor<boolean>
  readonly onOpen: () => void
  readonly onSave: () => void
}
interface StudioShortcuts {
  readonly openKeys: string
  readonly openLabel: string
  readonly saveKeys: string
  readonly saveLabel: string
}
export const useStudioShortcuts = (props: UseStudioShortcutsProps): StudioShortcuts => {
  const macPlatform = /Mac|iPhone|iPad|iPod/u.test(globalThis.navigator?.platform ?? '')
  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    const modifier = macPlatform ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.shiftKey ||
      !modifier ||
      (key !== 's' && key !== 'o') ||
      !props.enabled()
    ) {
      return
    }
    event.preventDefault()
    if (!event.repeat) {
      if (key === 's') {
        props.onSave()
      } else {
        props.onOpen()
      }
    }
  }
  globalThis.addEventListener('keydown', handleKeyDown)
  onCleanup(() => globalThis.removeEventListener('keydown', handleKeyDown))
  return {
    openKeys: macPlatform ? 'Meta+O' : 'Control+O',
    openLabel: macPlatform ? 'Cmd+O' : 'Ctrl+O',
    saveKeys: macPlatform ? 'Meta+S' : 'Control+S',
    saveLabel: macPlatform ? 'Cmd+S' : 'Ctrl+S',
  }
}
