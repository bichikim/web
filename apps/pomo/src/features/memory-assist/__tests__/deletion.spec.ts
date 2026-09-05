/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {deleteMemoryMemo, retryMemoryMemoDeletions} from '../deletion'
import {createMemoryMemo} from '../schedule'
import {type MemoryMemo, parseMemoryMemos} from '../schema'

const mocks = vi.hoisted(() => ({
  audio: vi.fn(),
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  read: vi.fn(),
  update: vi.fn(),
}))
vi.mock('../repository', () => ({readMemoryMemos: mocks.read, updateMemoryMemos: mocks.update}))
vi.mock('../../focus-room-dialogue', () => ({deleteDialogueAudio: mocks.audio}))

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
const remove = () => deleteMemoryMemo({deleteDialogue: mocks.deleteDialogue, memoId: memo.id})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.memos = [memo]
  mocks.read.mockImplementation(async () => mocks.memos)
  mocks.update.mockImplementation(async (update) => {
    mocks.memos = parseMemoryMemos(update(mocks.memos))!
    return mocks.memos
  })
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.audio.mockResolvedValue(undefined)
})

it('should leave the memo and audio unchanged when deletion intent cannot be saved', async () => {
  mocks.update.mockRejectedValueOnce(new Error('storage failed'))
  await expect(remove()).rejects.toThrow('storage failed')
  expect(mocks.memos).toEqual([memo])
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
  expect(mocks.audio).not.toHaveBeenCalled()
})

it('should persist deletion intent before deleting owned resources', async () => {
  mocks.deleteDialogue.mockImplementation(async () => {
    expect(mocks.memos).toEqual([{...memo, deletionPending: true}])
  })
  await expect(remove()).resolves.toBe('deleted')
  expect(mocks.memos).toEqual([])
  expect(mocks.audio).toHaveBeenCalledWith(memo.dialogueId, {failureMode: 'throw'})
})

it.each(['dialogue', 'audio', 'final persistence'])(
  'should retry %s failure from a persisted tombstone',
  async (failure) => {
    if (failure === 'dialogue') {
      mocks.deleteDialogue.mockRejectedValueOnce(new Error('db failed'))
    }
    if (failure === 'audio') {
      mocks.audio.mockRejectedValueOnce(new Error('cache failed'))
    }
    if (failure === 'final persistence') {
      mocks.audio.mockImplementationOnce(async () => {
        mocks.update.mockRejectedValueOnce(new Error('write failed'))
      })
    }
    await expect(remove()).resolves.toBe('cleanupPending')
    expect(mocks.memos).toEqual([{...memo, deletionPending: true}])

    await retryMemoryMemoDeletions(mocks.deleteDialogue)
    expect(mocks.memos).toEqual([])
    expect(mocks.audio).toHaveBeenLastCalledWith(memo.dialogueId, {failureMode: 'throw'})
  },
)

it('should share duplicate in-flight deletion requests', async () => {
  const pending = Promise.withResolvers<void>()
  mocks.deleteDialogue.mockReturnValue(pending.promise)
  const first = remove()
  const second = remove()
  pending.resolve()
  await expect(Promise.all([first, second])).resolves.toEqual(['deleted', 'deleted'])
  expect(mocks.deleteDialogue).toHaveBeenCalledOnce()
})

it.each([null, 'user-dialogue'])(
  'should preserve resources not owned by the memo (%s)',
  async (dialogueId) => {
    mocks.memos = [{...memo, dialogueId}]
    await expect(remove()).resolves.toBe('deleted')
    expect(mocks.memos).toEqual([])
    expect(mocks.deleteDialogue).not.toHaveBeenCalled()
    expect(mocks.audio).not.toHaveBeenCalled()
  },
)

it('should ignore absent memos and active memos during recovery', async () => {
  await retryMemoryMemoDeletions(mocks.deleteDialogue)
  expect(mocks.update).not.toHaveBeenCalled()
  mocks.memos = []
  await expect(remove()).resolves.toBe('deleted')
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
})

it('should attempt other pending deletions when one persistence retry fails', async () => {
  mocks.memos = [
    {...memo, deletionPending: true},
    {...memo, deletionPending: true, dialogueId: 'memory-memo-two', id: 'two'},
  ]
  mocks.update.mockRejectedValueOnce(new Error('one failed'))
  await expect(retryMemoryMemoDeletions(mocks.deleteDialogue)).rejects.toThrow(
    'Failed to retry memory memo deletions.',
  )
  expect(mocks.memos).toEqual([{...memo, deletionPending: true}])
  expect(mocks.deleteDialogue).toHaveBeenCalledExactlyOnceWith('memory-memo-two')
})
