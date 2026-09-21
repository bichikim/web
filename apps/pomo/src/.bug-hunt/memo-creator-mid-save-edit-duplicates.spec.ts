/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {readMemoryMemos, updateMemoryMemos} from '../features/memory-assist'
import {useMemoCreator} from '../components/memory-assist/use-memo-creator'

vi.mock('../features/memory-assist', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/memory-assist')>()
  return {
    ...actual,
    deleteMemoryMemoDraft: vi.fn(actual.deleteMemoryMemoDraft),
    readMemoryMemoDraft: vi.fn(actual.readMemoryMemoDraft),
    writeMemoryMemoDraft: vi.fn(actual.writeMemoryMemoDraft),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

it('should not persist the superseded draft when the user edits before the first save finishes', async () => {
  let resolveSave: (() => void) | undefined
  const saveGate = new Promise<void>((resolve) => {
    resolveSave = resolve
  })
  const originalUpdate = updateMemoryMemos
  vi.spyOn(await import('../features/memory-assist'), 'updateMemoryMemos').mockImplementationOnce(
    async (update) => {
      await saveGate
      return originalUpdate(update)
    },
  )

  const {result} = renderHook(() => useMemoCreator())
  result.changeOpen(true)
  result.changeText('first')
  const firstSave = result.save()
  result.changeText('second')

  resolveSave?.()
  await firstSave

  await result.save()

  const memos = await readMemoryMemos()
  expect(memos).toHaveLength(1)
  expect(memos[0]?.text).toBe('second')
})
