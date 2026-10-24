/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createRuntimeOptionResetManager} from 'src/features/dev-option-reset'
import {useStudioTourHint} from '../use-studio-tour-hint'

const storage = vi.hoisted(() => ({getItem: vi.fn(), removeItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storage}))

const HISTORY_KEY = 'pomo:focus-room-entry-history:v1'
const SESSION_KEY = 'pomo:focus-room-entry:v1'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
  Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
  storage.getItem.mockResolvedValue(null)
  storage.setItem.mockResolvedValue(undefined)
  storage.removeItem.mockResolvedValue(undefined)
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
  localStorage.clear()
  sessionStorage.clear()
})

it.each([null, 'true'])(
  'should not restore reset history after a disposed native read returns %s',
  async (value) => {
    const pending = Promise.withResolvers<string | null>()
    storage.getItem.mockImplementationOnce(() => pending.promise)
    const {result, cleanup} = renderHook(() => useStudioTourHint(() => true, vi.fn()))
    const entering = result.enter()
    await waitFor(() => expect(storage.getItem).toHaveBeenCalledOnce())
    cleanup()
    await expect(createRuntimeOptionResetManager().reset('entry')).resolves.toEqual({
      status: 'complete',
    })
    pending.resolve(value)
    await entering
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(result.visible()).toBe(false)
  },
)

it('should finish a pending native write before deleting the entry history', async () => {
  const pending = Promise.withResolvers<void>()
  const native = new Map<string, string>()
  storage.getItem.mockImplementation(async (key: string) => native.get(key) ?? null)
  storage.setItem.mockImplementation(async (key: string, value: string) => {
    await pending.promise
    native.set(key, value)
  })
  storage.removeItem.mockImplementation(async (key: string) => {
    native.delete(key)
  })
  sessionStorage.setItem(SESSION_KEY, 'true')
  const {cleanup} = renderHook(() => useStudioTourHint(() => false, vi.fn()))
  await waitFor(() => expect(storage.setItem).toHaveBeenCalledOnce())
  cleanup()
  const resetting = createRuntimeOptionResetManager().reset('entry')
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  const earlyRemovals = storage.removeItem.mock.calls.length
  pending.resolve()
  await resetting
  expect(earlyRemovals).toBe(0)
  expect(native.has(HISTORY_KEY)).toBe(false)
  expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
})

it('should remember a successful entry in web storage when native history reading fails', async () => {
  storage.getItem.mockRejectedValue(new Error('native read unavailable'))
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const {result, cleanup} = renderHook(() => useStudioTourHint(() => true, vi.fn()))
  await result.enter()
  expect(result.visible()).toBe(false)
  expect(localStorage.getItem(HISTORY_KEY)).toBe('true')
  cleanup()
  warning.mockRestore()
})
