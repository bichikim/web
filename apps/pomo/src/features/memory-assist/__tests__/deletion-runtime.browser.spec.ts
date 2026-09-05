/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {memoryMemoDeletion, readMemoryMemos} from '..'
import {createMemoryMemo} from '../schedule'

vi.mock('../../focus-room-dialogue', () => ({
  deleteDialogueAudio: vi.fn().mockResolvedValue(undefined),
}))

const memo = {
  ...createMemoryMemo({
    exactReminderAt: null,
    id: 'one',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '메모',
  }),
  dialogueId: 'memory-memo-one',
}
const other = {...memo, dialogueId: 'memory-memo-two', id: 'two'}
const key = 'pomo:memory-memos:v1'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(key, JSON.stringify([memo, other]))
})

it('should not erase stored memos when the initial browser read fails', async () => {
  const deleteDialogue = vi.fn()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
    throw new Error('read unavailable')
  })
  const result = await memoryMemoDeletion
    .delete({deleteDialogue, memoId: memo.id})
    .catch((error: unknown) => error)
  await expect(readMemoryMemos()).resolves.toEqual([memo, other])
  expect(result).toBeInstanceOf(Error)
  expect(deleteDialogue).not.toHaveBeenCalled()
})

it('should preserve unrelated memos and cleanup intent when the final browser read fails', async () => {
  const deleteDialogue = vi.fn(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('read unavailable')
    })
  })
  const result = await memoryMemoDeletion.delete({deleteDialogue, memoId: memo.id})
  await expect(readMemoryMemos()).resolves.toEqual([{...memo, deletionPending: true}, other])
  expect(result).toBe('cleanupPending')
})
