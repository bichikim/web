/** @vitest-environment jsdom */
import {setupMemos} from './fixtures/memos'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {type MemoryMemo, useMemoryMemos} from '../../../features/memory-assist'
import {MemoryMemoList} from '../Memos'

const {createStoredMemo} = setupMemos()

it('should retain an open memo draft when snapshots update and reorder the saved memos', () => {
  const first = createStoredMemo()
  const other = {...first, id: 'memo-2', text: '다른 메모'}
  const [memos, setMemos] = createSignal<ReadonlyArray<MemoryMemo>>([first, other])
  vi.mocked(useMemoryMemos).mockReturnValue(memos)
  render(() => <MemoryMemoList />)
  const rows = screen.getAllByRole('listitem')
  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  const editor = screen.getByRole('textbox', {name: '기억할 메모'})
  fireEvent.input(editor, {target: {value: '아직 저장하지 않은 초안'}})
  editor.focus()
  setMemos([
    {...other, text: '갱신한 다른 메모'},
    {...first, updatedAt: '2026-10-01T00:01:00Z'},
  ])
  expect(screen.getByRole('textbox', {name: '기억할 메모'})).toBe(editor)
  expect(editor).toHaveValue('아직 저장하지 않은 초안')
  expect(editor).toHaveFocus()
  screen.getAllByRole('listitem', {hidden: true}).forEach((row, index) => {
    expect(row).toBe(rows[1 - index])
  })
  expect(screen.getByText('갱신한 다른 메모')).toBeVisible()
})
