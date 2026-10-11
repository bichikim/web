import {type Accessor, createEffect, createSignal} from 'solid-js'
import type {CodeDocument, CodeToken} from '../shared/contracts'
import type {CodeSelection, CodeTextRange, NavigationPoint} from './types'
import {useTextSelection} from './use-text-selection'
import {getKeyboardLine} from './get-keyboard-line'

interface CodeInteractionOptions {
  container: Accessor<HTMLElement | null>
  document: Accessor<CodeDocument>
  selection: Accessor<CodeSelection | undefined>
  selectable: Accessor<boolean>
  onSelect?: (anchor: number, focus: number) => void
  onSelectText?: (range: CodeTextRange) => void
  onFollow: (token: CodeToken, point?: NavigationPoint) => void
}

interface LineDrag {
  anchor: number
  focus: number
  pointerId: number
}

export const useCodeInteraction = (options: CodeInteractionOptions) => {
  const [anchor, setAnchor] = createSignal<number | null>(null)
  const [drag, setDrag] = createSignal<LineDrag | null>(null)
  const selectText = (range: CodeTextRange): void => {
    setAnchor(range.line)
    options.onSelectText?.(range)
  }
  const selectRange = (line: number, endLine: number): void => {
    const previous = options.selection()
    if (
      previous?.line !== Math.min(line, endLine) ||
      previous.endLine !== Math.max(line, endLine)
    ) {
      setAnchor(line)
    }
    options.onSelect?.(line, endLine)
  }
  const textSelection = useTextSelection({
    container: options.container,
    onSelect: selectText,
  })
  const selected = (line: number): boolean => {
    const selection = options.selection() ?? null
    const location = selection ?? options.document().location
    const endLine = selection?.endLine ?? location.line
    const lastSelectedLine =
      selection?.endColumn === 1 && endLine > location.line ? endLine - 1 : endLine
    return line >= location.line && line <= lastSelectedLine
  }
  createEffect(() => {
    options.document()
    setAnchor(null)
    setDrag(null)
  })
  const selectLine = (line: number, extend: boolean): number => {
    const start = extend ? (anchor() ?? options.selection()?.line ?? line) : line
    setAnchor(start)
    options.onSelect?.(start, line)
    return start
  }
  const handlePointerDown = (event: PointerEvent & {currentTarget: HTMLDivElement}): void => {
    const {target} = event
    if (event.button !== 0 || !(target instanceof HTMLElement) || !options.selectable()) {
      return
    }
    const button = target.closest<HTMLButtonElement>('button[data-line-number]')
    if (button === null) {
      return
    }
    event.preventDefault()
    event.currentTarget.ownerDocument.getSelection()?.removeAllRanges()
    button.focus({preventScroll: true})
    const line = Number(button.dataset.lineNumber)
    const start = selectLine(line, event.shiftKey)
    setDrag({anchor: start, focus: line, pointerId: event.pointerId})
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handlePointerMove = (event: PointerEvent & {currentTarget: HTMLDivElement}): void => {
    const current = drag()
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    const row = event.currentTarget.ownerDocument
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-line]')
    if (row !== null && row !== undefined && event.currentTarget.contains(row)) {
      const line = Number(row.dataset.line)
      if (line !== current.focus) {
        setDrag({...current, focus: line})
        options.onSelect?.(current.anchor, line)
      }
    }
  }
  const handlePointerEnd = (event: PointerEvent): void => {
    const current = drag()
    if (current === null && event.type === 'pointerup') {
      textSelection.synchronize()
    }
    if (current !== null && current.pointerId === event.pointerId) {
      setDrag(null)
      options
        .container()
        ?.querySelector<HTMLButtonElement>(`[data-line-number="${current.focus}"]`)
        ?.focus({preventScroll: true})
    }
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    const {target} = event
    if (!(target instanceof HTMLButtonElement) || target.dataset.lineNumber === undefined) {
      return
    }
    const line = Number(target.dataset.lineNumber)
    const next = getKeyboardLine(event.key, line, options.document().lines.length)
    if (next === null) {
      return
    }
    event.preventDefault()
    selectLine(next, event.shiftKey)
    options.container()?.querySelector<HTMLButtonElement>(`[data-line-number="${next}"]`)?.focus()
  }
  const handleClick = (event: MouseEvent): void => {
    const {target} = event
    if (!(target instanceof HTMLElement)) {
      return
    }
    const button = target.closest<HTMLButtonElement>('button[data-line-number]')
    if (button !== null) {
      if (event.detail === 0) {
        selectLine(Number(button.dataset.lineNumber), event.shiftKey)
      }
      return
    }
    const link = target.closest<HTMLAnchorElement>('a[data-offset]')
    if (link === null) {
      return
    }
    event.preventDefault()
    const offset = Number(link.dataset.offset)
    if (event.detail > 0 && textSelection.hasSelection()) {
      textSelection.synchronize()
      return
    }
    const token = options
      .document()
      .lines.flat()
      .find((entry) => entry.offset === offset && entry.navigation !== null)
    if (token !== undefined) {
      const rect = link.getBoundingClientRect()
      options.onFollow(token, {x: rect.left, y: rect.bottom})
    }
  }
  return {
    handleClick,
    handleKeyboard,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    selected,
    selectRange,
    selectText,
  }
}
