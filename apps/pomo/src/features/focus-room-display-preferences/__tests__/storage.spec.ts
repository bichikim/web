/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createPDisplayPreferencesRepository,
  DEFAULT_P_DISPLAY_PREFERENCES,
  type PDisplayPreferencesStorage,
  readPDisplayPreferences,
  writePDisplayPreferences,
} from '../index'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const visiblePreferences = {
  dialogueComposerVisible: true,
  memoryAssistVisible: true,
  playerVisible: true,
  pomodoroVisible: true,
  toolsButtonVisible: true,
  tourButtonVisible: true,
} as const
const STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn<(key: string) => Promise<unknown | null>>(async (key) => {
      return tossValues.get(key) ?? null
    }),
    readWeb: vi.fn<(key: string) => unknown | null>((key) => webValues.get(key) ?? null),
    usesTossStorage: vi.fn(() => false),
    writeToss: vi.fn(async (key: string, value: unknown) => {
      tossValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies PDisplayPreferencesStorage

  return {
    repository: createPDisplayPreferencesRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.unstubAllGlobals()
})

describe('focus-room display preference repository', () => {
  it('should reject a browser save when browser storage fails', async () => {
    const {repository, storage} = createStorageHarness()
    storage.writeWeb.mockImplementation(() => {
      throw new Error('browser unavailable')
    })

    await expect(repository.write(visiblePreferences)).rejects.toThrow(
      'Failed to persist focus-room display preferences.',
    )
  })

  it('should persist through toss storage when the browser cache is unavailable', async () => {
    const {tossValues, repository, storage} = createStorageHarness()
    storage.usesTossStorage.mockReturnValue(true)
    storage.writeWeb.mockImplementation(() => {
      throw new Error('browser unavailable')
    })

    await expect(repository.write(visiblePreferences)).resolves.toBeUndefined()
    expect(tossValues.get(STORAGE_KEY)).toEqual(visiblePreferences)
  })

  it('should continue toss writes after an earlier write fails', async () => {
    const {tossValues, repository, storage} = createStorageHarness()
    storage.usesTossStorage.mockReturnValue(true)
    storage.writeToss
      .mockRejectedValueOnce(new Error('toss unavailable'))
      .mockImplementationOnce(async (key, value) => {
        tossValues.set(key, value)
      })

    await expect(repository.write(DEFAULT_P_DISPLAY_PREFERENCES)).rejects.toThrow(
      'Failed to persist focus-room display preferences.',
    )
    await expect(repository.write(visiblePreferences)).resolves.toBeUndefined()
    expect(tossValues.get(STORAGE_KEY)).toEqual(visiblePreferences)
  })

  it('should wait for an active toss write before reading the preferences', async () => {
    const {tossValues, repository, storage} = createStorageHarness()
    storage.usesTossStorage.mockReturnValue(true)
    tossValues.set(STORAGE_KEY, DEFAULT_P_DISPLAY_PREFERENCES)
    let completeWrite: () => void = () => undefined
    storage.writeToss.mockImplementation(
      (key, value) =>
        new Promise((resolve) => {
          completeWrite = () => {
            tossValues.set(key, value)
            resolve()
          }
        }),
    )

    const pendingWrite = repository.write(visiblePreferences)
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
    const pendingRead = repository.read()
    completeWrite()

    await expect(pendingWrite).resolves.toBeUndefined()
    await expect(pendingRead).resolves.toEqual(visiblePreferences)
    expect(storage.readToss).toHaveBeenCalledOnce()
  })
})

it('should default dialogue composer visibility to off when no valid setting exists', async () => {
  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)

  localStorage.setItem('pomo:focus-room-display-preferences:v1', '{invalid')
  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)
})

it('should persist and restore dialogue composer visibility on the web', async () => {
  await writePDisplayPreferences(visiblePreferences)

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(visiblePreferences),
  )
})

it('should restore toss preferences and rebuild the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(JSON.stringify(visiblePreferences))

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(visiblePreferences),
  )
})

it('should use the default when toss preferences are empty', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(null)

  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)
})

it('should reject a toss read failure instead of using the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem('pomo:focus-room-display-preferences:v1', JSON.stringify(visiblePreferences))
  storageMocks.getItem.mockRejectedValue(new Error('toss unavailable'))

  await expect(readPDisplayPreferences()).rejects.toThrow(
    'Failed to read focus-room display preferences.',
  )
})

it('should replace a stale browser copy with the toss preferences', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const hiddenPreferences = {
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  } as const
  localStorage.setItem('pomo:focus-room-display-preferences:v1', JSON.stringify(hiddenPreferences))
  storageMocks.getItem.mockResolvedValue(JSON.stringify(visiblePreferences))

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:focus-room-display-preferences:v1')
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(visiblePreferences),
  )
})

it('should reject a toss save when toss storage fails', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockRejectedValue(new Error('toss unavailable'))

  await expect(writePDisplayPreferences(visiblePreferences)).rejects.toThrow(
    'Failed to persist focus-room display preferences.',
  )
})

it('should restore toss state after a failed toss save', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const hiddenPreferences = {
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  } as const
  storageMocks.getItem.mockResolvedValue(JSON.stringify(hiddenPreferences))
  storageMocks.setItem.mockRejectedValueOnce(new Error('toss unavailable'))

  await expect(writePDisplayPreferences(visiblePreferences)).rejects.toThrow(
    'Failed to persist focus-room display preferences.',
  )
  await expect(readPDisplayPreferences()).resolves.toEqual(hiddenPreferences)
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(hiddenPreferences),
  )
})

it('should preserve a newer choice while toss preferences are loading', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let tossPreferences = JSON.stringify({
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem
    .mockReturnValueOnce(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )
    .mockImplementation(async () => tossPreferences)
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    tossPreferences = value
  })

  const pendingRead = readPDisplayPreferences()
  await writePDisplayPreferences(visiblePreferences)
  completeRead(
    JSON.stringify({
      dialogueComposerVisible: false,
      memoryAssistVisible: true,
      playerVisible: true,
      pomodoroVisible: true,
      toolsButtonVisible: true,
      tourButtonVisible: true,
    }),
  )

  await expect(pendingRead).resolves.toEqual(visiblePreferences)
})

it('should preserve toss write order during rapid preference changes', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const tossWrites: string[] = []
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    tossWrites.push(value)
  })
  const hiddenPreferences = {
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  } as const

  await Promise.all([
    writePDisplayPreferences(visiblePreferences),
    writePDisplayPreferences(hiddenPreferences),
  ])

  expect(tossWrites).toEqual([
    JSON.stringify(visiblePreferences),
    JSON.stringify(hiddenPreferences),
  ])
})

it('should persist dialogue composer visibility to toss storage', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockResolvedValue()

  await writePDisplayPreferences(visiblePreferences)

  expect(storageMocks.setItem).toHaveBeenCalledWith(
    'pomo:focus-room-display-preferences:v1',
    JSON.stringify(visiblePreferences),
  )
})

it('should keep the tour visible for preferences saved before the tour setting existed', async () => {
  const harness = createStorageHarness()
  harness.webValues.set(STORAGE_KEY, {dialogueComposerVisible: true})
  await expect(harness.repository.read()).resolves.toEqual({
    dialogueComposerVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
})

it('should persist and restore a hidden tour button', async () => {
  const harness = createStorageHarness()
  await harness.repository.write({
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: false,
  })
  await expect(harness.repository.read()).resolves.toEqual({
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: false,
  })
})

it.each([false, true])(
  'should default legacy toolbar preferences and restore hidden choices (toss=%s)',
  async (toss) => {
    const harness = createStorageHarness()
    harness.storage.usesTossStorage.mockReturnValue(toss)
    const values = toss ? harness.tossValues : harness.webValues
    values.set('pomo:focus-room-display-preferences:v1', {
      dialogueComposerVisible: false,
      tourButtonVisible: true,
    })
    const legacy = await harness.repository.read()
    expect(legacy.playerVisible).toBe(true)
    expect(legacy.pomodoroVisible).toBe(true)
    expect(legacy.toolsButtonVisible).toBe(true)
    expect(legacy.memoryAssistVisible).toBe(true)
    await harness.repository.write({
      ...legacy,
      memoryAssistVisible: false,
      playerVisible: true,
      pomodoroVisible: true,
      toolsButtonVisible: false,
    })
    expect(await harness.repository.read()).toEqual({
      ...legacy,
      memoryAssistVisible: false,
      playerVisible: true,
      pomodoroVisible: true,
      toolsButtonVisible: false,
    })
  },
)

it.each([false, true])('should persist hidden widgets (toss=%s)', async (toss) => {
  const harness = createStorageHarness()
  harness.storage.usesTossStorage.mockReturnValue(toss)
  await harness.repository.write({
    dialogueComposerVisible: false,
    memoryAssistVisible: true,
    playerVisible: false,
    pomodoroVisible: false,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  await expect(harness.repository.read()).resolves.toEqual(
    expect.objectContaining({playerVisible: false, pomodoroVisible: false}),
  )
})
