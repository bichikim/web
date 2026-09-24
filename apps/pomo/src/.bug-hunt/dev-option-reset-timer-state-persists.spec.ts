/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('src/features/dev-option-reset/delete-stored-dialogue-audio', () => ({
  deleteStoredDialogueAudio: vi.fn(),
}))
vi.mock('src/features/locale', () => ({
  LOCALE_RESET_STORAGE_COUNT: 1,
  resetLocale: vi.fn(async () => undefined),
}))

import {createOptionResetManager, type OptionResetStorage} from 'src/features/dev-option-reset'
import {POMODORO_TIMER_STORAGE_KEY} from 'src/features/pomodoro-timer/storage'

const createStorage = (): OptionResetStorage => ({
  getToss: vi.fn(async () => null),
  removeToss: vi.fn(async () => undefined),
  removeWeb: vi.fn((key) => {
    localStorage.removeItem(key)
  }),
  setToss: vi.fn(async () => undefined),
  setWeb: vi.fn((key, value) => {
    localStorage.setItem(key, value)
  }),
  usesTossStorage: vi.fn(() => false),
})

afterEach(() => {
  localStorage.clear()
})

it('should clear persisted pomodoro timer state when timer options are reset', async () => {
  const runningState = {
    completedFocusSessions: 2,
    endsAt: Date.now() + 60_000,
    phase: 'focus',
    status: 'running',
  }
  localStorage.setItem(POMODORO_TIMER_STORAGE_KEY, JSON.stringify(runningState))

  const storage = createStorage()
  const manager = createOptionResetManager({
    resetEntrySession: vi.fn(),
    resetLocale: vi.fn(async () => undefined),
    storage,
  })

  await manager.reset('timer')

  expect(localStorage.getItem(POMODORO_TIMER_STORAGE_KEY)).toBeNull()
})
