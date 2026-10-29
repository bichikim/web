import {type Accessor, createEffect, onCleanup} from 'solid-js'
import type {CodeTextRange} from './types'
import {readTextSelection} from './read-text-selection'

interface UseTextSelectionProps {
  container: Accessor<HTMLElement | null>
  onSelect: (range: CodeTextRange) => void
}

export const useTextSelection = (props: UseTextSelectionProps) => {
  const read = () => {
    const container = props.container()
    return container === null ? null : readTextSelection(container)
  }
  const synchronize = (): void => {
    const selection = read()
    if (selection !== null) {
      props.onSelect(selection)
    }
  }
  createEffect(() => {
    const document = props.container()?.ownerDocument
    if (document === undefined) {
      return
    }
    document.addEventListener('selectionchange', synchronize)
    onCleanup(() => document.removeEventListener('selectionchange', synchronize))
  })
  return {
    hasSelection: () => read() !== null,
    synchronize,
  }
}
