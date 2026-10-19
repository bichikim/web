import {type Accessor, createEffect, onCleanup} from 'solid-js'
import type {CodeTextRange} from './types'
import {readTextSelection} from './read-text-selection'

interface TextSelectionOptions {
  container: Accessor<HTMLElement | null>
  onSelect: (range: CodeTextRange) => void
}

export const useTextSelection = (options: TextSelectionOptions) => {
  const read = () => {
    const container = options.container()
    return container === null ? null : readTextSelection(container)
  }
  const synchronize = (): void => {
    const selection = read()
    if (selection !== null) {
      options.onSelect(selection)
    }
  }
  createEffect(() => {
    const document = options.container()?.ownerDocument
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
