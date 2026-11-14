import {EditorSelection, EditorState, Text} from '@codemirror/state'
import {expect, it} from 'vitest'
import {editorKey} from '../editor-keys.js'

it.each(['\r', '\r\n', '\n'])(
  'should move and edit logical lines while retaining the original %j separator',
  (separator) => {
    const source = `one${separator}second`
    const start = source.indexOf('second')
    const state = (offset: number) =>
      EditorState.create({
        doc: Text.of(source.split('\n')),
        selection: EditorSelection.cursor(offset),
      })
    const options = {editable: true, rows: 10, verticalHead: undefined}
    const home = editorKey(state(start + 2), {key: 'home'}, options)
    expect('editor' in home && home.editor?.selection.main.head).toBe(start)
    const removed = editorKey(state(start), {key: 'backspace'}, options)
    expect('editor' in removed && removed.editor?.doc.toString()).toBe('onesecond')
    const inserted = editorKey(state(3), {key: 'return'}, options)
    expect('editor' in inserted && inserted.editor?.doc.toString()).toBe(
      `one${separator}${separator}second`,
    )
  },
)
