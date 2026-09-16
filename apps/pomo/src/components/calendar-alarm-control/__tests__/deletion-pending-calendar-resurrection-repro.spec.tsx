/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {MEMORY_MEMOS_CHANGED_EVENT} from '../../../features/memory-assist/repository'
import {createMemoryMemo} from '../../../features/memory-assist/schedule'
import type {MemoryMemo} from '../../../features/memory-assist/schema'
import {useMemoryMemos} from '../../../features/memory-assist/use-memos'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

const mocks = vi.hoisted(() => ({readMemos: vi.fn()}))

vi.mock('../../../features/focus-room-dialogue', () => ({
  usePEvents: () => ({deleteDialogue: vi.fn()}),
}))

vi.mock('../../../features/memory-assist/repository', async () => {
  const actual = await vi.importActual<typeof import('../../../features/memory-assist/repository')>(
    '../../../features/memory-assist/repository',
  )

  return {
    ...actual,
    readMemoryMemos: mocks.readMemos,
  }
})

const now = () => new Date('2026-09-04T08:00:00.000Z')
const event = {
  accountLabel: 'Work',
  allDay: false,
  calendarLabel: 'Calendar',
  id: 'connection-1:["work","abcde12345"]',
  start: '2026-09-05T09:00:00.000Z',
  title: '팀 회의',
} as const

const createMemoryMemosChangedEvent = (memos: ReadonlyArray<MemoryMemo>, revision: number) =>
  new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {
    detail: {memos, revision},
  })

it('should keep a deleted calendar alarm inactive after a stale storage event omits deletionPending', async () => {
  const deletedMemo = {
    ...createMemoryMemo({
      exactReminderAt: new Date('2026-09-05T09:00:00.000Z').toISOString(),
      id: 'calendar-alarm:connection-1:["work","abcde12345"]',
      now: now(),
      random: () => 0,
      recallMode: 'none',
      text: '팀 회의 일정 알람이에요.',
    }),
    deletionPending: true as const,
    dialogueId: 'memory-memo-calendar-alarm',
  }
  const staleMemo = {...deletedMemo, deletionPending: undefined}
  delete (staleMemo as {deletionPending?: true}).deletionPending

  mocks.readMemos.mockResolvedValue([])
  const memosView = renderHook(useMemoryMemos)
  await flushPromises()

  window.dispatchEvent(createMemoryMemosChangedEvent([deletedMemo], 2))
  expect(memosView.result()).toEqual([])

  window.dispatchEvent(createMemoryMemosChangedEvent([staleMemo], 3))
  await flushPromises()

  render(() => <CalendarAlarmControl now={now} event={event} memos={memosView.result} />)

  expect(screen.getByRole('button', {name: '팀 회의 알람 설정'})).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '팀 회의 알람 수정'})).not.toBeInTheDocument()

  memosView.cleanup()
})
