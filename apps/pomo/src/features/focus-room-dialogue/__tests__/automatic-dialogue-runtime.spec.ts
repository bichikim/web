/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createAutomaticDialogueRuntimeRepository,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
  AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY as key,
} from '../automatic-dialogue-settings'
const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))
beforeEach(() => {
  localStorage.clear()
  native.getItem.mockReset()
  native.setItem.mockReset()
})
afterEach(() => {
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
const enableNative = () =>
  Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
const settings = {modelId: 'full', version: 1, voiceId: 'Yuna'} as const
it('should persist browser settings under the existing key without accessing native storage', async () => {
  const repository = createAutomaticDialogueRuntimeRepository()
  await repository.write(settings)
  await expect(repository.read()).resolves.toEqual(settings)
  expect(JSON.parse(localStorage.getItem(key) ?? '')).toEqual(settings)
  expect(native.setItem).not.toHaveBeenCalled()
})
it('should restore native settings when browser storage has no copy and mirror them', async () => {
  enableNative()
  native.getItem.mockResolvedValue(JSON.stringify(settings))
  await expect(createAutomaticDialogueRuntimeRepository().read()).resolves.toEqual(settings)
  expect(native.getItem).toHaveBeenCalledWith(key)
  expect(JSON.parse(localStorage.getItem(key) ?? '')).toEqual(settings)
})
it('should recover valid native settings when the browser copy is malformed', async () => {
  enableNative()
  localStorage.setItem(key, '{invalid')
  native.getItem.mockResolvedValue(JSON.stringify(settings))

  await expect(createAutomaticDialogueRuntimeRepository().read()).resolves.toEqual(settings)
  expect(JSON.parse(localStorage.getItem(key) ?? '')).toEqual(settings)
})
it('should recover valid native settings when browser storage cannot be read', async () => {
  enableNative()
  native.getItem.mockResolvedValue(JSON.stringify(settings))
  const repository = createAutomaticDialogueRuntimeRepository({
    getItem: () => {
      throw new Error('browser storage unavailable')
    },
    setItem: vi.fn(),
  })

  await expect(repository.read()).resolves.toEqual(settings)
})
it('should repair the native copy from legacy browser settings before browser data is removed', async () => {
  enableNative()
  let stored: string | null = null
  native.getItem.mockImplementation(async () => stored)
  native.setItem.mockImplementation(async (_key: string, value: string) => {
    stored = value
  })
  localStorage.setItem(key, JSON.stringify(settings))
  const repository = createAutomaticDialogueRuntimeRepository()
  await expect(repository.read()).resolves.toEqual(settings)
  expect(native.setItem).toHaveBeenCalledWith(key, JSON.stringify(settings))
  localStorage.clear()
  await expect(repository.read()).resolves.toEqual(settings)
})
it('should report failed native writes and retain the browser copy for recovery', async () => {
  enableNative()
  native.setItem.mockRejectedValue(new Error('bridge unavailable'))
  const repository = createAutomaticDialogueRuntimeRepository()
  await expect(repository.write(settings)).rejects.toThrow(
    'Failed to persist automatic dialogue settings.',
  )
  expect(JSON.parse(localStorage.getItem(key) ?? '')).toEqual(settings)
})
it('should preserve invalid browser data errors and use defaults for absent data', async () => {
  const repository = createAutomaticDialogueRuntimeRepository()
  await expect(repository.read()).resolves.toEqual(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
  localStorage.setItem(key, '{invalid')
  await expect(repository.read()).rejects.toThrow('저장된 자동 음성 생성 설정이 올바르지 않아요.')
})

it('should decode one browser snapshot even if the next getter result would be absent', async () => {
  const storage = {
    getItem: vi.fn().mockReturnValueOnce(JSON.stringify(settings)).mockReturnValue(null),
    setItem: vi.fn(),
  }
  await expect(createAutomaticDialogueRuntimeRepository(storage).read()).resolves.toEqual(settings)
  expect(storage.getItem).toHaveBeenCalledOnce()
  expect(storage.getItem).toHaveBeenCalledWith(key)
})
