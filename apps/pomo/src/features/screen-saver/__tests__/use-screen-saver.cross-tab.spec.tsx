/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {SCREEN_SAVER_STORAGE_KEY, writeScreenSaverDelay} from '../storage'
import {useScreenSaver} from '../use-screen-saver'

const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))

let revision = 0
const settle = () => vi.advanceTimersByTimeAsync(0)
const notify = (key: string | null, storageArea: Storage = localStorage) =>
  globalThis.dispatchEvent(new StorageEvent('storage', {key, storageArea}))

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(1_800_000_000_000 + revision * 1_000_000)
  revision += 1
  localStorage.clear()
  native.getItem.mockReset()
  native.setItem.mockReset().mockResolvedValue(undefined)
  await writeScreenSaverDelay('1m')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
  vi.useRealTimers()
  localStorage.clear()
})

it('should cancel the receiving consumer deadline after an external disabled preference is saved', async () => {
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  expect(result.delay()).toBe('1m')
  await vi.advanceTimersByTimeAsync(30_000)

  await writeScreenSaverDelay('off')
  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()

  expect(result.delay()).toBe('off')
  await vi.advanceTimersByTimeAsync(60_000)
  expect(result.isActive()).toBe(false)
})

it('should dismiss an already active receiver after an external disabled preference is saved', async () => {
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(result.isActive()).toBe(true)

  await writeScreenSaverDelay('off')
  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()

  expect(result.delay()).toBe('off')
  expect(result.isActive()).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

it('should preserve the pending deadline when an external event restores the same delay', async () => {
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  await vi.advanceTimersByTimeAsync(30_000)
  await writeScreenSaverDelay('1m')

  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()
  await vi.advanceTimersByTimeAsync(30_000)

  expect(result.delay()).toBe('1m')
  expect(result.isActive()).toBe(true)
})

it('should ignore other keys and session storage without restarting the pending deadline', async () => {
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  await vi.advanceTimersByTimeAsync(30_000)
  const read = vi.spyOn(Storage.prototype, 'getItem')

  notify('another-preference')
  notify(SCREEN_SAVER_STORAGE_KEY, sessionStorage)
  await settle()

  expect(read).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(result.isActive()).toBe(true)
})

it('should restore a clear event through the repository while preserving its latest known value', async () => {
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  await writeScreenSaverDelay('off')
  localStorage.clear()
  const read = vi.spyOn(Storage.prototype, 'getItem')

  notify(null)
  await settle()

  expect(read).toHaveBeenCalled()
  expect(result.delay()).toBe('off')
})

it('should retain the current value on a failed event read and restore after a later event', async () => {
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError')
  })

  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()
  expect(read).toHaveBeenCalled()
  expect(result.delay()).toBe('1m')
  read.mockRestore()

  await writeScreenSaverDelay('off')
  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()
  expect(result.delay()).toBe('off')
})

it('should unsubscribe the selected storage when its provider is disposed', async () => {
  const removal = vi.spyOn(globalThis, 'removeEventListener')
  const view = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  view.cleanup()
  expect(removal).toHaveBeenCalledWith('storage', expect.any(Function), false)
  const read = vi.spyOn(Storage.prototype, 'getItem')

  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()

  expect(read).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

it('should read native authority after an event rather than applying an older web cache', async () => {
  Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
  const latest = {delay: 'off', savedAt: Date.now() + 100}
  native.getItem.mockResolvedValue(JSON.stringify(latest))
  const {result} = renderHook(useScreenSaver, {wrapper: PreferenceProvider})
  await settle()
  expect(result.delay()).toBe('off')
  native.getItem.mockClear()
  localStorage.setItem(
    SCREEN_SAVER_STORAGE_KEY,
    JSON.stringify({delay: '1m', savedAt: Date.now() + 50}),
  )

  notify(SCREEN_SAVER_STORAGE_KEY)
  await settle()

  expect(native.getItem).toHaveBeenCalled()
  expect(result.delay()).toBe('off')
  expect(JSON.parse(localStorage.getItem(SCREEN_SAVER_STORAGE_KEY)!)).toEqual(latest)
})
