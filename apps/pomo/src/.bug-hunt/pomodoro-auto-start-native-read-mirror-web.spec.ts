/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createAutoStartStorage, readAutoStartPreference} from '../features/pomodoro-timer/auto-start-storage'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

describe('pomodoro auto-start storage read repair', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
    vi.restoreAllMocks()
  })

  it('should mirror a newer native auto-start preference into browser storage on read', async () => {
    localStorage.setItem(
      'pomo:timer-auto-start:v2',
      JSON.stringify({isEnabled: false, savedAt: 10}),
    )
    storageMocks.getItem.mockResolvedValue(JSON.stringify({isEnabled: true, savedAt: 15}))

    expect(await readAutoStartPreference()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '')).toEqual({
      isEnabled: true,
      savedAt: 15,
    })
  })

  it('should keep the repaired browser copy after the native bridge disappears', async () => {
    const repository = createAutoStartStorage({
      now: () => 20,
      storage: {
        readToss: readTossStorageJson,
        readWeb: readWebStorageJson,
        usesTossStorage: hasNativeStorageBridge,
        writeToss: writeTossStorageJson,
        writeWeb: writeWebStorageJson,
      },
    })
    localStorage.setItem(
      'pomo:timer-auto-start:v2',
      JSON.stringify({isEnabled: false, savedAt: 10}),
    )
    storageMocks.getItem.mockResolvedValue(JSON.stringify({isEnabled: true, savedAt: 15}))

    expect(await repository.read()).toBe(true)
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))

    expect(await repository.read()).toBe(true)
  })
})
