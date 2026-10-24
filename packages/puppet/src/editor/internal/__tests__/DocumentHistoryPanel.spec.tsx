/** @vitest-environment jsdom */
import {fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {DocumentHistoryPanel} from '../DocumentHistoryPanel'
import type {DocumentHistoryEntry} from '../../use-document-history'

test('should expose named history entries and navigate while keeping the selected button focused', () => {
  const [entries, setEntries] = createSignal<ReadonlyArray<DocumentHistoryEntry>>([
    {id: 0, state: 'past', title: '문서 열기'},
    {id: 1, state: 'current', title: '불투명도 변경'},
    {id: 2, state: 'future', title: '키폼 편집'},
  ])
  const onSelect = vi.fn()
  const view = render(() => <DocumentHistoryPanel entries={entries()} onSelect={onSelect} />)
  const panel = within(view.getByRole('region', {name: '작업 기록'}))
  expect(panel.queryByRole('button', {name: '실행 취소'})).toBeNull()
  expect(panel.queryByRole('button', {name: '다시 실행'})).toBeNull()
  const timeline = within(panel.getByRole('list', {name: '작업 시점'}))
  expect(timeline.getAllByRole('button').map((button) => button.textContent)).toEqual([
    '키폼 편집다시 실행 가능',
    '불투명도 변경현재',
    '문서 열기',
  ])
  expect(panel.getByRole('button', {current: 'step', name: '불투명도 변경'})).toBeVisible()
  const target = panel.getByRole('button', {name: '문서 열기'})
  target.focus()
  fireEvent.click(target)
  expect(onSelect).toHaveBeenCalledWith(0)
  setEntries((previous) =>
    previous.map((entry) => ({...entry, state: entry.id === 0 ? 'current' : 'future'})),
  )
  expect(panel.getByRole('button', {current: 'step', name: '문서 열기'})).toBe(target)
  expect(target).toHaveFocus()
  expect(panel.getAllByText('다시 실행 가능')).toHaveLength(2)
  setEntries((previous) => [
    ...previous.map((entry) => ({...entry, state: 'past' as const})),
    {id: 3, state: 'current', title: '레이어 이름 변경'},
  ])
  expect(timeline.getAllByRole('button')[0]).toHaveAccessibleName('레이어 이름 변경')
  expect(timeline.getAllByRole('button').at(-1)).toHaveAccessibleName('문서 열기')
})
