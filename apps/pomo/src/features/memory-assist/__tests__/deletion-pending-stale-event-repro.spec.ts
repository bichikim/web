/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {expect, it, vi} from 'vitest'

import {MEMORY_MEMOS_CHANGED_EVENT} from '../repository'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'
import {useMemoryMemos} from '../use-memos'

const mocks = vi.hoisted(() => ({readMemos: vi.fn()}))

vi.mock('../repository', () => ({
  MEMORY_MEMOS_CHANGED_EVENT: 'pomo:memory-memos-changed',
  readMemoryMemos: mocks.readMemos,
}))

const createMemoryMemosChangedEvent = (memos: ReadonlyArray<MemoryMemo>, revision: number) =>
  new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {
    detail: {memos, revision},
  })

it('should not resurrect a tombstoned memo when a newer storage event omits deletionPending', async () => {
  const deletedMemo = {
    ...createMemoryMemo({
      exactReminderAt: null,
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '삭제한 메모',
    }),
    deletionPending: true as const,
  }
  const staleMemo = {...deletedMemo, deletionPending: undefined}
  delete (staleMemo as {deletionPending?: true}).deletionPending

  mocks.readMemos.mockResolvedValue([])
  const view = renderHook(useMemoryMemos)
  await flushPromises()

  window.dispatchEvent(createMemoryMemosChangedEvent([deletedMemo], 2))
  expect(view.result()).toEqual([])

  window.dispatchEvent(createMemoryMemosChangedEvent([staleMemo], 3))
  await flushPromises()

  expect(view.result()).toEqual([])
  view.cleanup()
})
