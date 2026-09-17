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

  globalThis.dispatchEvent(createMemoryMemosChangedEvent([newMemo], 1))
  read.resolve([staleMemo])
  await flushPromises()

  expect(view.result()).toEqual([newMemo])
  view.cleanup()
})

it('should ignore an older storage event after a newer event', () => {
  const staleMemo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '오래된 메모',
  })
  const currentMemo = {
    ...staleMemo,
    text: '최신 메모',
    updatedAt: '2026-09-04T03:00:00.000Z',
  }
  mocks.readMemos.mockResolvedValue([currentMemo])
  const view = renderHook(useMemoryMemos)

  globalThis.dispatchEvent(createMemoryMemosChangedEvent([currentMemo], 2))
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([staleMemo], 1))

  expect(view.result()).toEqual([currentMemo])
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
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([memo], 1))
  expect(view.result()).toEqual([memo])
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([{...memo, deletionPending: true}], 2))
  expect(view.result()).toEqual([])
  view.cleanup()
})

it('should not resurrect a tombstoned memo from a newer storage event', () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'deleted',
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '삭제한 메모',
  })
  mocks.readMemos.mockResolvedValue([])
  const view = renderHook(useMemoryMemos)

  globalThis.dispatchEvent(createMemoryMemosChangedEvent([{...memo, deletionPending: true}], 2))
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([memo], 3))

  expect(view.result()).toEqual([])
  view.cleanup()
})

it('should continue hiding a stale memo after its tombstone is removed', () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'deleted',
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '삭제한 메모',
  })
  mocks.readMemos.mockResolvedValue([])
  const view = renderHook(useMemoryMemos)

  globalThis.dispatchEvent(createMemoryMemosChangedEvent([{...memo, deletionPending: true}], 2))
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([], 3))
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([memo], 4))

  expect(view.result()).toEqual([])
  view.cleanup()
})

it('should show a recreated memo with the same id after deletion', () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'deleted',
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '삭제한 메모',
  })
  const recreatedMemo = createMemoryMemo({
    exactReminderAt: null,
    id: memo.id,
    now: new Date('2026-09-04T04:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '새 메모',
  })
  mocks.readMemos.mockResolvedValue([])
  const view = renderHook(useMemoryMemos)

  globalThis.dispatchEvent(createMemoryMemosChangedEvent([{...memo, deletionPending: true}], 2))
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([], 3))
  globalThis.dispatchEvent(createMemoryMemosChangedEvent([recreatedMemo], 4))

  expect(view.result()).toEqual([recreatedMemo])
  view.cleanup()
})
