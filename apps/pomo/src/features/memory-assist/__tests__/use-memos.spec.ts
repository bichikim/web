/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {expect, it, vi} from 'vitest'

import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'
import {useMemoryMemos} from '../use-memos'

const mocks = vi.hoisted(() => ({readMemos: vi.fn()}))

vi.mock('../repository', () => ({
  MEMORY_MEMOS_CHANGED_EVENT: 'pomo:memory-memos-changed',
  readMemoryMemos: mocks.readMemos,
}))

it('should not replace a newer storage event with a stale initial read', async () => {
  const read = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  mocks.readMemos.mockReturnValue(read.promise)
  const staleMemo = createMemoryMemo({
    exactReminderAt: null,
    id: 'stale',
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '오래된 메모',
  })
  const newMemo = {...staleMemo, id: 'new', text: '새 메모'}
  const view = renderHook(useMemoryMemos)

  window.dispatchEvent(new CustomEvent('pomo:memory-memos-changed', {detail: [newMemo]}))
  read.resolve([staleMemo])
  await flushPromises()

  expect(view.result()).toEqual([newMemo])
  view.cleanup()
})

it('should hide persisted deletion tombstones from the list and reminders', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'deleted',
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '삭제한 메모',
  })
  mocks.readMemos.mockResolvedValue([{...memo, deletionPending: true}])
  const view = renderHook(useMemoryMemos)
  await flushPromises()
  expect(view.result()).toEqual([])
  window.dispatchEvent(new CustomEvent('pomo:memory-memos-changed', {detail: [memo]}))
  expect(view.result()).toEqual([memo])
  window.dispatchEvent(
    new CustomEvent('pomo:memory-memos-changed', {detail: [{...memo, deletionPending: true}]}),
  )
  expect(view.result()).toEqual([])
  view.cleanup()
})
