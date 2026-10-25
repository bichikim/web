/** @vitest-environment jsdom */
import {Compartment, EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {history, undo} from '@codemirror/commands'
import {afterEach, expect, it, vi} from 'vitest'
import {within} from '@solidjs/testing-library'
import {createChangeInspection} from '../create-change-inspection'
import {createLineChanges} from '../../create-line-changes'

let view: EditorView | undefined
afterEach(() => {
  view?.destroy()
  document.body.replaceChildren()
})
it('should expand a comparison in the editor without editing source or replacing undo history', () => {
  const parent = document.createElement('div')
  document.body.append(parent)
  const source = 'before\nafter'
  const compartment = new Compartment()
  view = new EditorView({
    parent,
    state: EditorState.create({doc: source, extensions: [history(), compartment.of([])]}),
  })
  view.dispatch({changes: {from: source.length, insert: '!'}})
  view.dispatch({
    effects: compartment.reconfigure(
      createChangeInspection({
        inspection: {
          active: 0,
          base: 'HEAD',
          hunks: createLineChanges('before\nremoved\nafter!', 'before\nafter!'),
          path: 'main.txt',
          source: 'before\nafter!',
        },
        onClose: vi.fn(),
        onNavigate: vi.fn(),
      }),
    ),
  })
  expect(within(parent).getByRole('region', {name: '변경 사항'})).toBeInTheDocument()
  expect(within(parent).queryByRole('dialog')).toBeNull()
  expect(view.state.sliceDoc()).toBe('before\nafter!')
  view.dispatch({effects: compartment.reconfigure([])})
  expect(within(parent).queryByRole('region', {name: '변경 사항'})).toBeNull()
  expect(undo(view)).toBe(true)
  expect(view.state.sliceDoc()).toBe(source)
})
