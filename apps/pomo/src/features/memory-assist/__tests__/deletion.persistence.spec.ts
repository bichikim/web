/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {deleteMemoryMemo, readMemoryMemos, retryMemoryMemoDeletions} from '..'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'

const mocks = vi.hoisted(() => ({
  audio: vi.fn(),
  native: true,
  nativeError: null as Error | null,
  nativeSnapshot: [] as ReadonlyArray<MemoryMemo>,
  webError: null as Error | null,
  webSnapshot: [] as ReadonlyArray<MemoryMemo>,
}))
vi.mock('../../focus-room-dialogue', () => ({deleteDialogueAudio: mocks.audio}))
vi.mock('../../runtime-storage', async () => ({
  ...(await vi.importActual('../../runtime-storage')),
  createSerialNativeStorageWriter: () => ({
    write: async (_key: string, value: ReadonlyArray<MemoryMemo>) => {
      if (mocks.nativeError === null) {
        mocks.nativeSnapshot = structuredClone(value)
      }
      return mocks.nativeError
    },
  }),
  hasNativeStorageBridge: () => mocks.native,
  readNativeStorageJson: async () => structuredClone(mocks.nativeSnapshot),
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
  mocks.nativeError = null
  mocks.webError = null
  mocks.nativeSnapshot = [memo]
  mocks.webSnapshot = [memo]
  mocks.audio.mockResolvedValue(undefined)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => JSON.stringify(mocks.webSnapshot))
})

it.each([true, false])(
  'should preserve audio when authoritative memo storage rejects deletion (native: %s)',
  async (native) => {
    mocks.native = native
    if (native) {
      mocks.nativeError = new Error('native failed')
    } else {
      mocks.webError = new Error('web failed')
    }
    const deleteDialogue = vi.fn()
    await expect(deleteMemoryMemo({deleteDialogue, memoId: memo.id})).rejects.toThrow(
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
    await expect(deleteMemoryMemo({deleteDialogue, memoId: memo.id})).resolves.toBe(
      'cleanupPending',
    )
    expect(metadataExists).toBe(false)
    await expect(readMemoryMemos()).resolves.toEqual([{...memo, deletionPending: true}])

    await retryMemoryMemoDeletions(deleteDialogue)
    await expect(readMemoryMemos()).resolves.toEqual([])
    expect(mocks.audio).toHaveBeenCalledTimes(2)
  },
)
