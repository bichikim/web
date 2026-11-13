import {type Accessor, onCleanup} from 'solid-js'

interface UseSearchShortcutProps {
  readonly container: Accessor<HTMLElement | null>
  readonly open: (text?: string) => void
}

/** Owns the find shortcut while mounted, optionally seeding it from selected viewer text. */
export const useSearchShortcut = (props: UseSearchShortcutProps): void => {
  const handle = (event: KeyboardEvent): void => {
    if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'f') {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const selection = globalThis.getSelection()
    const container = props.container()
    const text =
      selection !== null &&
      selection.rangeCount > 0 &&
      container?.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.toString()
        : undefined
    props.open(text)
  }
  globalThis.addEventListener('keydown', handle, {capture: true})
  onCleanup(() => globalThis.removeEventListener('keydown', handle, {capture: true}))
}
