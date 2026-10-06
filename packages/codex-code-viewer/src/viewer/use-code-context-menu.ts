import {type Accessor, createEffect, createSignal, untrack} from 'solid-js'
import type {CodeDocument} from '../shared/contracts'
import type {CodeSelection, CodeTextRange, ContextMenuCloseOptions} from './types'
import {readContextSelection} from './read-context-selection'

interface CodeContext {
  text: string
  selection: CodeSelection
  x: number
  y: number
  returnFocus: HTMLElement | null
}

interface CodeContextMenuOptions {
  container: Accessor<HTMLElement | null>
  document: Accessor<CodeDocument>
  selection: Accessor<CodeSelection | undefined>
  onSelect?: (anchor: number, focus: number) => void
  onSelectText?: (range: CodeTextRange) => void
}

export const useCodeContextMenu = (options: CodeContextMenuOptions) => {
  const [context, setContext] = createSignal<CodeContext | null>(null)
  const close = (settings?: ContextMenuCloseOptions): void => {
    const previous = context()
    setContext(null)
    if (settings?.restoreFocus !== false) {
      previous?.returnFocus?.focus({preventScroll: true})
    }
  }
  createEffect(() => {
    options.document()
    untrack(() => close({restoreFocus: false}))
  })
  const open = (
    target: HTMLElement,
    x: number,
    y: number,
    point?: {x: number; y: number},
  ): void => {
    const container = options.container()
    if (container === null) {
      return
    }
    const document = options.document()
    const previous = options.selection() ?? {...document.location, endLine: document.location.line}
    const row = target.closest<HTMLElement>('[data-line]')
    const resolved = readContextSelection({container, document, point, selection: previous, target})
    if (!resolved.preserveNativeSelection) {
      container.ownerDocument.getSelection()?.removeAllRanges()
    }
    const selected = resolved.selection
    if (selected.endColumn !== undefined) {
      options.onSelectText?.({...selected, endColumn: selected.endColumn})
    } else if (row !== null) {
      options.onSelect?.(selected.line, selected.endLine)
    }
    setContext({
      returnFocus: row?.querySelector<HTMLButtonElement>('button') ?? null,
      selection: selected,
      text: resolved.text,
      x,
      y,
    })
  }
  const handleContextMenu = (event: MouseEvent): void => {
    if (!(event.target instanceof HTMLElement)) {
      return
    }
    event.preventDefault()
    const rect = event.target.getBoundingClientRect()
    open(event.target, event.clientX || rect.left, event.clientY || rect.bottom, {
      x: event.clientX,
      y: event.clientY,
    })
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing || !(event.target instanceof HTMLElement)) {
      return
    }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      const rect = event.target.getBoundingClientRect()
      open(event.target, rect.right, rect.bottom)
    }
  }
  return {close, context, handleContextMenu, handleKeyboard}
}
