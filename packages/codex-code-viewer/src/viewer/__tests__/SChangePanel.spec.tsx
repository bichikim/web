/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SChangePanel} from '../SChangePanel'
import {createLineChanges} from '../create-line-changes'

afterEach(cleanup)
it('should show deleted source between surrounding context with old and current line numbers', () => {
  const source = 'const before = 1\nconst after = 2'
  const hunks = createLineChanges('const before = 1\nconst removed = 0\nconst after = 2', source)
  render(() => (
    <SChangePanel
      inspection={{active: 0, base: 'HEAD', hunks, path: 'main.ts', source}}
      onClose={vi.fn()}
    />
  ))
  const panel = screen.getByRole('region', {name: '변경 사항'})
  expect(screen.queryByRole('dialog')).toBeNull()
  const rows = within(panel).getAllByRole('row')
  expect(rows.map((row) => row.textContent)).toEqual([
    '11 const before = 1',
    '2−const removed = 0',
    '32 const after = 2',
  ])
  expect(within(panel).getAllByText('const', {exact: true})).toHaveLength(3)
})
it('should navigate changes and close with Escape without trapping the document', () => {
  const navigate = vi.fn()
  const close = vi.fn()
  const source = 'a\nB\nc\nD'
  render(() => (
    <SChangePanel
      inspection={{
        active: 0,
        base: 'HEAD',
        hunks: createLineChanges('a\nb\nc\nd', source),
        path: 'main.txt',
        source,
      }}
      onNavigate={navigate}
      onClose={close}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '다음 변경 사항'}))
  expect(navigate).toHaveBeenCalledExactlyOnceWith(1)
  fireEvent.keyDown(screen.getByRole('region', {name: '변경 사항'}), {key: 'Escape'})
  expect(close).toHaveBeenCalledOnce()
})
