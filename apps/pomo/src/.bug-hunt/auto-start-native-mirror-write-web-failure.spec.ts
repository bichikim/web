/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {
  type AutoStartStorageAdapter,
  createAutoStartStorage,
} from '../features/pomodoro-timer/auto-start-storage'
import {parseStorageJson} from 'src/utils/runtime-storage'

const AUTO_START_KEY = 'pomo:timer-auto-start:v2'

it('should keep native auto-start preference after a failed web mirror and bridge loss', async () => {
  const web = new Map<string, string>()
  const nativePreference = {isEnabled: true, savedAt: 20}
  const staleWebPreference = {isEnabled: false, savedAt: 10}
  web.set(AUTO_START_KEY, JSON.stringify(staleWebPreference))

  const usesTossStorage = vi.fn(() => true)
  const writeWebSpy = vi.fn((): unknown | null => new Error('blocked'))

  const storage: AutoStartStorageAdapter = {
    readToss: async (key, parse) =>
      parseStorageJson(key === AUTO_START_KEY ? JSON.stringify(nativePreference) : null, parse),
    readWeb: (key, parse) => parseStorageJson(web.get(key) ?? null, parse),
    usesTossStorage,
    writeToss: vi.fn(async () => undefined),
    writeWeb: (key, value) => {
      writeWebSpy(key, value)
      return new Error('blocked')
    },
  }

  const repository = createAutoStartStorage({now: () => 30, storage})

  expect(await repository.read()).toBe(true)

  usesTossStorage.mockReturnValue(false)

  await expect(repository.read()).resolves.toBe(true)
})
