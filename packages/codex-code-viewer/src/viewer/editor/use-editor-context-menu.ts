import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {type EditorState, Text} from '@codemirror/state'
import type {EditorView} from '@codemirror/view'
import type {CodeSnippet, ContextMenuCloseOptions} from '../types'

interface UseEditorContextMenuProps {
  readonly view: Accessor<EditorView | undefined>
  readonly path: Accessor<string>
  readonly readOnly: Accessor<boolean>
  readonly onError?: (error: unknown) => void
  readonly onShare?: (selection: CodeSnippet) => void
  readonly onFind?: (text?: string) => void
}

interface EditorContext {
  readonly x: number
  readonly y: number
  readonly onCopy?: () => Promise<void>
  readonly onCut?: () => Promise<void>
  readonly onPaste?: () => Promise<void>
  readonly onShare?: () => void
  readonly onFind?: () => void
}

const MENU_INSET = 8

export const useEditorContextMenu = (props: UseEditorContextMenuProps) => {
  const [context, setContext] = createSignal<EditorContext | null>(null)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const close = (options?: ContextMenuCloseOptions): void => {
    setContext(null)
    if (options?.restoreFocus !== false) {
      props.view()?.focus()
    }
  }
  const replace = (editor: EditorView, state: EditorState, text: string, event: string): void => {
    if (disposed || props.view() !== editor) {
      return
    }
    const current = editor.state
    if (
      props.readOnly() ||
      current.readOnly ||
      current.doc !== state.doc ||
      !current.selection.eq(state.selection)
    ) {
      props.onError?.(new Error('내용이나 선택이 변경됐습니다. 다시 선택해 주세요.'))
      return
    }
    editor.dispatch({
      ...current.replaceSelection(Text.of(text.split(/\r\n|\r|\n/u))),
      scrollIntoView: true,
      userEvent: event,
    })
  }
  const write = async (
    editor: EditorView,
    state: EditorState,
    action: 'copy' | 'cut',
  ): Promise<void> => {
    const selected = state.selection.main
    try {
      await navigator.clipboard.writeText(state.sliceDoc(selected.from, selected.to))
      if (action === 'cut') {
        replace(editor, state, '', 'delete.cut')
      }
    } catch (error) {
      props.onError?.(error)
    }
  }
  const paste = async (editor: EditorView, state: EditorState): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.length > 0) {
        replace(editor, state, text, 'input.paste')
      }
    } catch (error) {
      props.onError?.(error)
    }
  }
  const open = (editor: EditorView, x: number, y: number): void => {
    const {state} = editor
    const selected = state.selection.main
    const start = state.doc.lineAt(selected.from)
    const end = state.doc.lineAt(selected.to)
    const text = selected.empty ? '' : state.sliceDoc(selected.from, selected.to)
    const selection: CodeSnippet = {
      column: selected.empty ? 1 : selected.from - start.from + 1,
      endLine: end.number,
      kind: 'code',
      line: start.number,
      path: props.path(),
      text: selected.empty ? start.text : text,
      ...(selected.empty ? {} : {endColumn: selected.to - end.from + 1}),
    }
    const readOnly = props.readOnly() || state.readOnly
    setContext({
      onCopy: selected.empty ? undefined : () => write(editor, state, 'copy'),
      onCut: selected.empty || readOnly ? undefined : () => write(editor, state, 'cut'),
      onFind: props.onFind === undefined ? undefined : () => props.onFind?.(text),
      onPaste: readOnly ? undefined : () => paste(editor, state),
      onShare: props.onShare === undefined ? undefined : () => props.onShare?.(selection),
      x,
      y,
    })
  }
  const handleContextMenu = (event: MouseEvent): void => {
    const editor = props.view()
    if (editor === undefined) {
      return
    }
    event.preventDefault()
    const position = editor.posAtCoords({x: event.clientX, y: event.clientY})
    const selected = editor.state.selection.main
    if (position !== null && (position < selected.from || position > selected.to)) {
      editor.dispatch({selection: {anchor: position}})
    }
    const coordinates =
      event.clientX === 0 && event.clientY === 0
        ? editor.coordsAtPos(editor.state.selection.main.head)
        : null
    open(
      editor,
      event.clientX || coordinates?.left || MENU_INSET,
      event.clientY || coordinates?.bottom || MENU_INSET,
    )
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (
      event.isComposing ||
      !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
    ) {
      return
    }
    const editor = props.view()
    if (editor === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const coordinates = editor.coordsAtPos(editor.state.selection.main.head)
    open(editor, coordinates?.left ?? MENU_INSET, coordinates?.bottom ?? MENU_INSET)
  }
  return {close, context, handleContextMenu, handleKeyboard}
}
