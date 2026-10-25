/** @vitest-environment jsdom */
import {Compartment, EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createEditorExtensions} from '../create-editor-extensions'
import {createChangeGutter} from '../create-change-gutter'
import {createLineChanges} from '../../create-line-changes'

let view: EditorView | undefined
afterEach(() => {
  view?.destroy()
  document.body.replaceChildren()
})
it('should order interactive gutters as numbers, changes and folding', async () => {
  const parent = document.createElement('div')
  document.body.append(parent)
  const doc = 'function zoom() {\n  return 25\n}'
  view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: createEditorExtensions({
        changes: createChangeGutter({
          hunks: createLineChanges('function zoom() {\n  return 20\n}', doc),
          labels: {added: 'add', deleted: 'delete', modified: 'modify'},
          onOpen: vi.fn(),
        }),
        editability: new Compartment(),
        fileKey: 'main.ts',
        location: {path: 'main.ts'},
        marks: new Compartment(),
        onChange: vi.fn(),
        onFollow: vi.fn(),
        onSave: vi.fn(),
        onSelect: vi.fn(),
        separator: '\n',
        states: {get: vi.fn(), set: vi.fn()},
        writable: [],
      }),
    }),
  })
  await Promise.resolve()
  const fold = within(parent).getByRole('button', {name: '접기'})
  const change = within(parent).getByRole('button', {name: '2 · modify'})
  // CodeMirror's number gutter is intentionally hidden from assistive technology.
  const numbers = parent.querySelector('.cm-lineNumbers')!
  expect(numbers.compareDocumentPosition(change.closest('.cm-gutter')!)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(change.closest('.cm-gutter')!.compareDocumentPosition(fold.closest('.cm-gutter')!)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
})
