/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {loadTossStorage} from 'src/utils/runtime-storage/load-toss-storage'
import {useVisibilityPreferences} from '../use-visibility-preferences'

vi.mock('src/utils/runtime-storage/load-toss-storage', () => ({loadTossStorage: vi.fn()}))

const key = 'pomo:ui-auto-hide:v1'
const stored = {enabled: true, seconds: 120}
const getItem = vi.fn()
const setItem = vi.fn()

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ReactNativeWebView', {})
  vi.stubGlobal('reportError', vi.fn())
  getItem.mockResolvedValue(null)
  setItem.mockResolvedValue(undefined)
  vi.mocked(loadTossStorage).mockResolvedValue({getItem, setItem})
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it.each([null, JSON.stringify({enabled: false, seconds: 30})])(
  'should retain web preferences and repair native storage containing %s',
  async (native) => {
    localStorage.setItem(key, JSON.stringify(stored))
    getItem.mockResolvedValue(native)
    const {result} = renderHook(useVisibilityPreferences)
    await waitFor(() => expect(setItem).toHaveBeenCalledWith(key, JSON.stringify(stored)))
    expect(result.preferences()).toEqual(stored)
    expect(getItem).not.toHaveBeenCalled()
  },
)

it('should restore native preferences when web storage is empty', async () => {
  getItem.mockResolvedValue(JSON.stringify(stored))
  const {result} = renderHook(useVisibilityPreferences)
  await waitFor(() => expect(result.preferences()).toEqual(stored))
})

it('should preserve edits while native restoration is pending', async () => {
  const pending = Promise.withResolvers<string | null>()
  getItem.mockReturnValue(pending.promise)
  const {result} = renderHook(useVisibilityPreferences)
  result.onSecondsChange(90)
  pending.resolve(JSON.stringify(stored))
  await waitFor(() => expect(setItem).toHaveBeenCalled())
  expect(result.preferences()).toEqual({enabled: false, seconds: 90})
})

it('should report repair failure without losing web preferences', async () => {
  const error = new Error('native write failed')
  localStorage.setItem(key, JSON.stringify(stored))
  setItem.mockRejectedValue(error)
  const {result} = renderHook(useVisibilityPreferences)
  await waitFor(() => expect(globalThis.reportError).toHaveBeenCalledWith(error))
  expect(result.preferences()).toEqual(stored)
})

it('should restore web preferences without native calls in a browser', () => {
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
  localStorage.setItem(key, JSON.stringify(stored))
  const {result} = renderHook(useVisibilityPreferences)
  expect(result.preferences()).toEqual(stored)
  expect(loadTossStorage).not.toHaveBeenCalled()
})

it('should persist the latest edit after an in-flight repair', async () => {
  const pending = Promise.withResolvers<void>()
  localStorage.setItem(key, JSON.stringify(stored))
  setItem.mockReturnValueOnce(pending.promise)
  const {result} = renderHook(useVisibilityPreferences)
  await waitFor(() => expect(setItem).toHaveBeenCalledTimes(1))
  result.onSecondsChange(90)
  pending.resolve()
  await waitFor(() =>
    expect(setItem).toHaveBeenLastCalledWith(key, JSON.stringify({enabled: true, seconds: 90})),
  )
  expect(result.preferences()).toEqual({enabled: true, seconds: 90})
})

it('should ignore native restoration after disposal', async () => {
  const pending = Promise.withResolvers<string | null>()
  getItem.mockReturnValue(pending.promise)
  const view = renderHook(useVisibilityPreferences)
  await waitFor(() => expect(getItem).toHaveBeenCalled())
  view.cleanup()
  pending.resolve(JSON.stringify(stored))
  await pending.promise
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(view.result.preferences()).toEqual({enabled: false, seconds: 30})
})
