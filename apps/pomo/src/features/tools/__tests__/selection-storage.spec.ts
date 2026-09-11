/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {
  lunarDirectionStorage,
  movingSelectionStorage,
  unitSelectionStorage,
} from '../selection-storage'
const {getItem, setItem} = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem, setItem}}))
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  vi.restoreAllMocks()
})
it('should restore each tool selection independently', async () => {
  const units = {category: 'area', from: 'pyeong', to: 'm2'} as const
  await unitSelectionStorage.write(units)
  await lunarDirectionStorage.write('lunar')
  await movingSelectionStorage.write({month: '5', year: '2027'})
  await expect(unitSelectionStorage.read()).resolves.toEqual(units)
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
  await expect(movingSelectionStorage.read()).resolves.toEqual({month: '5', year: '2027'})
})
it('should reject mismatched units, unknown directions and unsupported months', async () => {
  localStorage.setItem(
    'pomo:tool-units:v1',
    JSON.stringify({category: 'length', from: 'kg', to: 'm'}),
  )
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"unknown"')
  localStorage.setItem('pomo:tool-moving:v1', JSON.stringify({month: '13', year: '2051'}))
  await expect(unitSelectionStorage.read()).resolves.toBeNull()
  await expect(lunarDirectionStorage.read()).resolves.toBeNull()
  await expect(movingSelectionStorage.read()).resolves.toBeNull()
})
it('should use native storage and restore after a pending native save', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  let complete: (() => void) | undefined
  let stored = '"solar"'
  getItem.mockImplementation(() => Promise.resolve(stored))
  setItem.mockImplementation(
    (_key: string, value: string) =>
      new Promise<void>((resolve) => {
        complete = () => {
          stored = value
          resolve()
        }
      }),
  )
  const saving = lunarDirectionStorage.write('lunar')
  await vi.waitFor(() => expect(setItem).toHaveBeenCalled())
  const restoring = lunarDirectionStorage.read()
  complete?.()
  await saving
  await expect(restoring).resolves.toBe('lunar')
})
it.each([
  {
    key: 'pomo:tool-units:v1',
    storage: unitSelectionStorage,
    value: {category: 'area', from: 'pyeong', to: 'm2'},
  },
  {key: 'pomo:tool-lunar-direction:v1', storage: lunarDirectionStorage, value: 'lunar'},
  {key: 'pomo:tool-moving:v1', storage: movingSelectionStorage, value: {month: '5', year: '2027'}},
])('should restore the web copy for $key when native is missing', async ({storage, key, value}) => {
  vi.stubGlobal('ReactNativeWebView', {})
  getItem.mockResolvedValue(null)
  localStorage.setItem(key, JSON.stringify(value))
  await expect(storage.read()).resolves.toEqual(value)
})
it.each(['"solar"', '{invalid', '"unknown"'])(
  'should prefer web selection over native %s',
  async (stored) => {
    vi.stubGlobal('ReactNativeWebView', {})
    getItem.mockResolvedValue(stored)
    localStorage.setItem('pomo:tool-lunar-direction:v1', '"lunar"')
    await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
  },
)
it('should restore the web copy after native persistence fails', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  setItem.mockRejectedValue(new Error('native unavailable'))
  await expect(lunarDirectionStorage.write('lunar')).rejects.toThrow('native unavailable')
  getItem.mockResolvedValue(null)
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
})
it('should return a selection saved during a native read', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const delayed = Promise.withResolvers<string | null>()
  getItem.mockReturnValueOnce(delayed.promise)
  const reading = lunarDirectionStorage.read()
  await vi.waitFor(() => expect(getItem).toHaveBeenCalled())
  await lunarDirectionStorage.write('lunar')
  delayed.resolve('"solar"')
  await expect(reading).resolves.toBe('lunar')
})
it('should restore valid native data when the web copy is invalid', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"unknown"')
  getItem.mockResolvedValue('"solar"')
  await expect(lunarDirectionStorage.read()).resolves.toBe('solar')
})
it('should retry a stale native read when browser storage is unavailable', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const delayed = Promise.withResolvers<string | null>()
  getItem.mockReturnValueOnce(delayed.promise).mockResolvedValue('"lunar"')
  const reading = lunarDirectionStorage.read()
  await vi.waitFor(() => expect(getItem).toHaveBeenCalled())
  await lunarDirectionStorage.write('lunar')
  delayed.resolve('"solar"')
  await expect(reading).resolves.toBe('lunar')
})
it('should preserve native read errors when there is no web copy', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  getItem.mockRejectedValue(new Error('read failed'))
  await expect(lunarDirectionStorage.read()).rejects.toThrow('read failed')
})
it('should return a concurrent save even when the old native read rejects', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const delayed = Promise.withResolvers<string | null>()
  getItem.mockReturnValueOnce(delayed.promise)
  const reading = lunarDirectionStorage.read()
  await vi.waitFor(() => expect(getItem).toHaveBeenCalled())
  await lunarDirectionStorage.write('lunar')
  delayed.reject(new Error('read failed'))
  await expect(reading).resolves.toBe('lunar')
})
it('should restore the native save when replacing an existing web copy fails', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"solar"')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })
  getItem.mockResolvedValue('"lunar"')
  await lunarDirectionStorage.write('lunar')
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
})

it('should preserve the existing web copy when both writes fail', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = 'solar'
  const next = 'lunar'
  localStorage.setItem('pomo:tool-lunar-direction:v1', JSON.stringify(previous))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  setItem.mockRejectedValue(new Error('native failed'))
  await expect(lunarDirectionStorage.write(next)).rejects.toThrow('native failed')
  await expect(lunarDirectionStorage.read()).resolves.toEqual(previous)
})
it('should wait for native persistence before restoring after web replacement fails', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = 'solar'
  const next = 'lunar'
  localStorage.setItem('pomo:tool-lunar-direction:v1', JSON.stringify(previous))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const delayed = Promise.withResolvers<void>()
  setItem.mockReturnValue(delayed.promise)
  getItem.mockResolvedValue(JSON.stringify(next))
  const saving = lunarDirectionStorage.write(next)
  const reading = lunarDirectionStorage.read()
  delayed.resolve()
  await saving
  await expect(reading).resolves.toEqual(next)
})
it('should retain a newer web save after an older native write completes', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = 'solar'
  const next = 'lunar'
  const webWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('blocked')
  })
  const delayed = Promise.withResolvers<void>()
  setItem.mockReturnValueOnce(delayed.promise).mockResolvedValue(undefined)
  const first = lunarDirectionStorage.write(previous)
  await vi.waitFor(() => expect(setItem).toHaveBeenCalled())
  webWrite.mockRestore()
  const second = lunarDirectionStorage.write(next)
  delayed.resolve()
  await Promise.all([first, second])
  expect(localStorage.getItem('pomo:tool-lunar-direction:v1')).toBe(JSON.stringify(next))
  await expect(lunarDirectionStorage.read()).resolves.toEqual(next)
})
it('should report an error if a readable stale web copy cannot be removed', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = 'solar'
  const next = 'lunar'
  localStorage.setItem('pomo:tool-lunar-direction:v1', JSON.stringify(previous))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  await expect(lunarDirectionStorage.write(next)).rejects.toThrow('Failed to discard stale')
})
