/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {memoryMemoDeletion, readMemoryMemos} from '..'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'

const mocks = vi.hoisted(() => ({
  audio: vi.fn(),
  native: true,
  tossError: null as Error | null,
  tossSnapshot: [] as ReadonlyArray<MemoryMemo>,
  webError: null as Error | null,
  webSnapshot: [] as ReadonlyArray<MemoryMemo>,
}))
vi.mock('../../focus-room-dialogue', () => ({deleteDialogueAudio: mocks.audio}))
vi.mock('src/utils/runtime-storage', async () => ({
  ...(await vi.importActual('src/utils/runtime-storage')),
  createLatestStorageWriter: () => async (value: ReadonlyArray<MemoryMemo>) => {
    if (mocks.tossError !== null) {
      throw mocks.tossError
    }
    mocks.tossSnapshot = structuredClone(value)
  },
  hasNativeStorageBridge: () => mocks.native,
  readTossStorageJson: async () => structuredClone(mocks.tossSnapshot),
  writeWebStorageJson: (_key: string, value: ReadonlyArray<MemoryMemo>) => {
    if (mocks.webError === null) {
      mocks.webSnapshot = structuredClone(value)
    }
    return mocks.webError
  },
}))

const memo = {
  ...createMemoryMemo({
    exactReminderAt: null,
    id: 'persisted',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'random',
    text: '메모',
  }),
  dialogueId: 'memory-memo-persisted',
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.tossError = null
  mocks.webError = null
  mocks.tossSnapshot = [memo]
  mocks.webSnapshot = [memo]
  mocks.audio.mockResolvedValue(undefined)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => JSON.stringify(mocks.webSnapshot))
})

it.each([true, false])(
  'should preserve audio when authoritative memo storage rejects deletion (native: %s)',
  async (native) => {
    mocks.native = native
    if (native) {
      mocks.tossError = new Error('native failed')
    } else {
      mocks.webError = new Error('web failed')
    }
    const deleteDialogue = vi.fn()
    await expect(memoryMemoDeletion.delete({deleteDialogue, memoId: memo.id})).rejects.toThrow(
      'Failed to persist memory memos.',
    )
    await expect(readMemoryMemos()).resolves.toEqual([memo])
    expect(deleteDialogue).not.toHaveBeenCalled()
    expect(mocks.audio).not.toHaveBeenCalled()
  },
)

it.each([true, false])(
  'should recover persisted audio cleanup after metadata is already gone (native: %s)',
  async (native) => {
    mocks.native = native
    let metadataExists = true
    const deleteDialogue = vi.fn(async () => {
      metadataExists = false
    })
    mocks.audio.mockRejectedValueOnce(new Error('cache failed'))
    await expect(memoryMemoDeletion.delete({deleteDialogue, memoId: memo.id})).resolves.toBe(
      'cleanupPending',
    )
    expect(metadataExists).toBe(false)
    await expect(readMemoryMemos()).resolves.toEqual([{...memo, deletionPending: true}])

    await memoryMemoDeletion.retry(deleteDialogue)
    await expect(readMemoryMemos()).resolves.toEqual([])
    expect(mocks.audio).toHaveBeenCalledTimes(2)
  },
)

it.each([true, false])(
  'should recover retired audio while preserving the edited memo (native: %s)',
  async (native) => {
    mocks.native = native
    const {updateMemoryMemos} = await import('..')
    await updateMemoryMemos((memos) =>
      memos.map((current) => ({
        ...current,
        dialogueId: null,
        retiredDialogueIds: [memo.dialogueId],
        text: '변경된 메모',
      })),
    )
    const deleteDialogue = vi.fn().mockResolvedValue(undefined)
    mocks.audio.mockRejectedValueOnce(new Error('cache failed'))
    await expect(memoryMemoDeletion.cleanup({deleteDialogue, memoId: memo.id})).rejects.toThrow(
      'cache failed',
    )
    expect((await readMemoryMemos())[0]).toMatchObject({
      dialogueId: null,
      retiredDialogueIds: [memo.dialogueId],
      text: '변경된 메모',
    })
    await memoryMemoDeletion.retry(deleteDialogue)
    expect((await readMemoryMemos())[0]).toMatchObject({
      dialogueId: null,
      retiredDialogueIds: [],
      text: '변경된 메모',
    })
    expect(mocks.audio).toHaveBeenCalledTimes(2)
  },
)
