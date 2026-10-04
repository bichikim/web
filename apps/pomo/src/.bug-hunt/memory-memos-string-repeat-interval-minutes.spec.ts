/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {
  createMemoryMemoRepository,
  MEMORY_MEMOS_STORAGE_KEY,
} from '../features/memory-assist/repository'

const memo = {
  createdAt: '2026-01-01T00:00:00.000Z',
  dialogueId: null,
  exactReminderAdvanceMinutes: 0,
  exactReminderAt: '2026-01-02T00:00:00.000Z',
  exactReminderRepeatIntervalMinutes: '10',
  exactReminderRepeatUntilMinutes: 60,
  id: 'm1',
  nextRecallAt: null,
  recallMode: 'none',
  reinforcementIndex: 0,
  reminderEvents: [],
  reminderHistory: [],
  text: 'memo',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
}

it('should load memos when exactReminderRepeatIntervalMinutes is persisted as a string', async () => {
  localStorage.setItem(MEMORY_MEMOS_STORAGE_KEY, JSON.stringify([memo]))
  const repository = createMemoryMemoRepository({
    readToss: async () => null,
    readWeb: () => localStorage.getItem(MEMORY_MEMOS_STORAGE_KEY),
    usesTossStorage: () => false,
    writeToss: async () => undefined,
    writeWeb: () => null,
  })

  await expect(repository.read()).resolves.toHaveLength(1)
})
