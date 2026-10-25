/** @vitest-environment jsdom */
import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {afterEach, expect, it, vi} from 'vitest'
import {createChangeGutter} from '../create-change-gutter'
import {createLineChanges} from '../../create-line-changes'

let view: EditorView | undefined
afterEach(() => {
  view?.destroy()
  document.body.replaceChildren()
})
it('should retain the deletion control through selection updates so pointer clicks complete', () => {
  const parent = document.createElement('div')
  document.body.append(parent)
  const open = vi.fn()
  const hunks = createLineChanges('before\nremoved\nafter', 'before\nafter')
  view = new EditorView({
    parent,
    state: EditorState.create({
      doc: 'before\nafter',
      extensions: [
        createChangeGutter({
          hunks,
          labels: {added: 'added', deleted: 'deleted', modified: 'modified'},
          onOpen: open,
        }),
      ],
    }),
  })
  const marker = parent.querySelector<HTMLButtonElement>('button')!
  expect(marker).toHaveAttribute('aria-label', '2 · deleted')
  expect(marker).toHaveAttribute('data-boundary', 'before')
  view.dispatch({selection: {anchor: 1}})
  expect(parent.querySelector('button')).toBe(marker)
  marker.click()
  expect(open).toHaveBeenCalledExactlyOnceWith(hunks[0])
})
