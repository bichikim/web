/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {createMemoryMemoDeletion} from '../features/memory-assist/deletion'
import {createMemoryMemo} from '../features/memory-assist/schedule'
import {type MemoryMemo, parseMemoryMemos} from '../features/memory-assist/schema'

const mocks = {
  audio: vi.fn(),
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  read: vi.fn(),
  reportError: vi.fn(),
  update: vi.fn(),
}

const memoId = 'calendar-alarm:event-1'
const retiredDialogueId = 'memory-memo-calendar-alarm:event-1'
const activeDialogueId = `${retiredDialogueId}:61f5d718-00b9-4187-a01e-c4a9792d7c31`

const baseMemo = {
  ...createMemoryMemo({
    exactReminderAt: '2026-09-15T09:00:00.000Z',
    id: memoId,
    now: new Date('2026-09-12T09:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '팀 회의',
  }),
  dialogueId: activeDialogueId,
  retiredDialogueIds: [retiredDialogueId],
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.memos = [baseMemo]
  mocks.read.mockImplementation(async () => mocks.memos)
  mocks.update.mockImplementation(async (update) => {
    mocks.memos = parseMemoryMemos(update(mocks.memos))!
    return mocks.memos
  })
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.audio.mockResolvedValue(undefined)
})

it('should preserve recreated memo audio during retired dialogue cleanup', async () => {
  const recreatedMemo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-16T09:00:00.000Z',
      id: memoId,
      now: new Date('2026-09-13T09:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '새 일정',
    }),
    dialogueId: retiredDialogueId,
  }

  mocks.deleteDialogue.mockImplementation(async (dialogueId) => {
    if (dialogueId === retiredDialogueId) {
      mocks.memos = [recreatedMemo]
    }
  })

  const deletion = createMemoryMemoDeletion({
    deleteAudio: mocks.audio,
    read: mocks.read,
    reportError: mocks.reportError,
    update: mocks.update,
  })

  await deletion.cleanup({deleteDialogue: mocks.deleteDialogue, memoId})

  expect(mocks.audio).not.toHaveBeenCalledWith(retiredDialogueId)
  expect(mocks.memos).toEqual([recreatedMemo])
})
