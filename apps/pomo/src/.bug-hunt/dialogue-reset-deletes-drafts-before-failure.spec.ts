/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import {DIALOGUE_DRAFT_KEY_PREFIX} from '../features/focus-room-dialogue/dialogue-draft'
import {createOptionResetManager, type OptionResetStorage} from '../features/dev-option-reset'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

const createStorage = (): OptionResetStorage => ({
  getToss: vi.fn(async () => null),
  removeSessionStorageByPrefix: vi.fn((prefix) => {
    const matchingKeys = Array.from({length: sessionStorage.length}, (_, index) =>
      sessionStorage.key(index),
    ).filter((key): key is string => key !== null && key.startsWith(prefix))
    matchingKeys.forEach((key) => sessionStorage.removeItem(key))
  }),
  removeToss: vi.fn(async () => undefined),
  removeWeb: vi.fn((key) => localStorage.removeItem(key)),
  setToss: vi.fn(async () => undefined),
  setWeb: vi.fn((key, value) => localStorage.setItem(key, value)),
  usesTossStorage: vi.fn(() => true),
})

it('should preserve dialogue drafts when durable dialogue reset fails', async () => {
  const draftKey = `${DIALOGUE_DRAFT_KEY_PREFIX}dialogue-id`
  const draftValue = 'unsaved edited dialogue'
  sessionStorage.setItem(draftKey, draftValue)
  localStorage.setItem('pomo:automatic-dialogue-settings:v1', 'custom')

  const storage = createStorage()
  vi.mocked(storage.removeToss).mockRejectedValue(new Error('toss unavailable'))

  const manager = createOptionResetManager({
    resetEntrySession: vi.fn(async () => undefined),
    resetLocale: vi.fn(async () => undefined),
    storage,
  })

  await expect(manager.reset('dialogue')).rejects.toThrow('Failed to reset Pomo options.')
  expect(sessionStorage.getItem(draftKey)).toBe(draftValue)
})
