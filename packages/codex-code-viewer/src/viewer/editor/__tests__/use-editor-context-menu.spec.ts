/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {history, undo} from '@codemirror/commands'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useEditorContextMenu} from '../use-editor-context-menu'

const disposers: (() => void)[] = []
const readText = vi.fn<() => Promise<string>>()
const writeText = vi.fn<(text: string) => Promise<void>>()
const setup = (readOnly = false) => {
  const editor = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc: 'const name = "hello"\nname()',
      extensions: [history(), EditorState.readOnly.of(readOnly)],
      selection: {anchor: 6, head: 10},
    }),
  })
  vi.spyOn(editor, 'posAtCoords').mockReturnValue(8)
  const onError = vi.fn()
  const onShare = vi.fn()
  const onFind = vi.fn()
  const menu = createRoot((dispose) => {
    disposers.push(dispose)
    return useEditorContextMenu({
      onError,
      onFind,
      onShare,
      path: () => 'main.ts',
      readOnly: () => readOnly,
      view: () => editor,
    })
  })
  disposers.push(() => editor.destroy())
  menu.handleContextMenu(new MouseEvent('contextmenu', {clientX: 80, clientY: 100}))
  const context = menu.context()!
  return {context, editor, menu, onError, onFind, onShare}
}

describe('useEditorContextMenu', () => {
  beforeEach(() => {
    readText.mockResolvedValue('replacement')
    writeText.mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {clipboard: {readText, writeText}})
  })
  afterEach(() => {
    disposers
      .splice(0)
      .reverse()
      .forEach((dispose) => dispose())
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('should copy only selected text after the menu closes', async () => {
    const {context, editor, menu} = setup()
    menu.close()
    await context.onCopy?.()
    expect(writeText).toHaveBeenCalledWith('name')
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
  })

  it('should cut the selection with one undoable edit', async () => {
    const {context, editor} = setup()
    await context.onCut?.()
    expect(writeText).toHaveBeenCalledWith('name')
    expect(editor.state.sliceDoc()).toBe('const  = "hello"\nname()')
    expect(undo(editor)).toBe(true)
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
  })

  it('should keep text when copying during a cut fails', async () => {
    const error = new Error('clipboard denied')
    writeText.mockRejectedValueOnce(error)
    const {context, editor, onError} = setup()
    await context.onCut?.()
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('should replace the selection with normalized clipboard text and support undo', async () => {
    readText.mockResolvedValueOnce('one\r\ntwo\rthree')
    const {context, editor} = setup()
    await context.onPaste?.()
    expect(editor.state.sliceDoc()).toBe('const one\ntwo\nthree = "hello"\nname()')
    expect(undo(editor)).toBe(true)
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
  })

  it('should preserve the selection when the clipboard is empty', async () => {
    readText.mockResolvedValueOnce('')
    const {context, editor} = setup()
    await context.onPaste?.()
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
  })

  it('should report clipboard read failures without changing the document', async () => {
    const error = new Error('clipboard denied')
    readText.mockRejectedValueOnce(error)
    const {context, editor, onError} = setup()
    await context.onPaste?.()
    expect(onError).toHaveBeenCalledWith(error)
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
  })

  it('should not apply an asynchronous paste after the selection changes', async () => {
    const {context, editor, onError} = setup()
    const pending = context.onPaste?.()
    editor.dispatch({selection: {anchor: 0}})
    await pending
    expect(editor.state.sliceDoc()).toBe('const name = "hello"\nname()')
    expect(onError).toHaveBeenCalledOnce()
  })

  it('should not cut new content after the document changes during clipboard writing', async () => {
    const {context, editor, onError} = setup()
    const pending = context.onCut?.()
    editor.dispatch({changes: {from: 0, insert: '// new\n'}})
    await pending
    expect(editor.state.sliceDoc()).toBe('// new\nconst name = "hello"\nname()')
    expect(onError).toHaveBeenCalledOnce()
  })

  it('should disable mutations for a read-only document while keeping copy and search', () => {
    const {context} = setup(true)
    expect(context.onCut).toBeUndefined()
    expect(context.onPaste).toBeUndefined()
    expect(context.onCopy).toBeTypeOf('function')
    expect(context.onFind).toBeTypeOf('function')
  })

  it('should share exact columns and use the selected text to search', () => {
    const {context, onFind, onShare} = setup()
    context.onShare?.()
    context.onFind?.()
    expect(onShare).toHaveBeenCalledWith({
      column: 7,
      endColumn: 11,
      endLine: 1,
      kind: 'code',
      line: 1,
      path: 'main.ts',
      text: 'name',
    })
    expect(onFind).toHaveBeenCalledWith('name')
  })

  it('should attach the current line as text when nothing is selected', () => {
    const {editor, menu, onShare} = setup()
    vi.mocked(editor.posAtCoords).mockReturnValue(22)
    menu.handleContextMenu(new MouseEvent('contextmenu', {clientX: 120, clientY: 140}))
    menu.context()?.onShare?.()
    expect(onShare).toHaveBeenCalledWith({
      column: 1,
      endLine: 2,
      kind: 'code',
      line: 2,
      path: 'main.ts',
      text: 'name()',
    })
  })

  it('should move the cursor for a right click outside the selection and disable empty copy', () => {
    const {editor, menu} = setup()
    vi.mocked(editor.posAtCoords).mockReturnValue(22)
    menu.handleContextMenu(new MouseEvent('contextmenu', {clientX: 120, clientY: 140}))
    expect(editor.state.selection.main.head).toBe(22)
    expect(menu.context()?.onCopy).toBeUndefined()
    expect(menu.context()?.onCut).toBeUndefined()
    expect(menu.context()?.onPaste).toBeTypeOf('function')
  })

  it('should open from Shift F10 and restore editor focus on close', () => {
    const {editor, menu} = setup()
    vi.spyOn(editor, 'coordsAtPos').mockReturnValue({bottom: 120, left: 90, right: 90, top: 96})
    const event = new KeyboardEvent('keydown', {cancelable: true, key: 'F10', shiftKey: true})
    menu.handleKeyboard(event)
    expect(event.defaultPrevented).toBe(true)
    expect(menu.context()).toMatchObject({x: 90, y: 120})
    menu.close()
    expect(document.activeElement).toBe(editor.contentDOM)
  })
})
