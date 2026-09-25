/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createMemoryMemo} from '../features/memory-assist/schedule'
import {useMemoryMemos} from '../features/memory-assist/use-memos'

const STORAGE_KEY = 'pomo:memory-memos:v1'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should refresh memos when another tab updates localStorage', async () => {
  const view = renderHook(useMemoryMemos)
  await flushPromises()
  expect(view.result()).toEqual([])

  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-cross-tab',
    now: new Date('2026-09-04T10:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '다른 탭에서 추가한 메모',
  })
  const serialized = JSON.stringify([memo])
  localStorage.setItem(STORAGE_KEY, serialized)
  globalThis.dispatchEvent(
    new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: serialized,
      storageArea: localStorage,
      url: globalThis.location.href,
    }),
  )
  await flushPromises()

  expect(view.result()).toEqual([memo])
  view.cleanup()
})
