/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {readServiceSettings, writeServiceSettings} from '../service-storage'

const {getItem, setItem} = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem, setItem}}))
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  vi.restoreAllMocks()
})
it('should restore custom duration and mode along with the date and branch', async () => {
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await writeServiceSettings(settings)
  await expect(readServiceSettings()).resolves.toEqual(settings)
  await writeServiceSettings({...settings, manual: false})
  await expect(readServiceSettings()).resolves.toEqual({...settings, manual: false})
})
it('should preserve the previously saved enlistment date and reject malformed data', async () => {
  localStorage.setItem('pomo:service-start:v1', '"2026-09-01"')
  await expect(readServiceSettings()).resolves.toMatchObject({manual: false, start: '2026-09-01'})
  localStorage.setItem('pomo:service-start:v1', '"2026-02-30"')
  localStorage.setItem('pomo:service-settings:v1', '{"manual":"true"}')
  await expect(readServiceSettings()).resolves.toMatchObject({manual: false, start: ''})
})
it('should use native storage and wait for saves before restoring', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  let finish: (() => void) | undefined
  const values = new Map([['pomo:service-start:v1', '"2026-08-01"']])
  getItem.mockImplementation((key: string) => Promise.resolve(values.get(key) ?? null))
  setItem.mockImplementation(
    (key: string, value: string) =>
      new Promise<void>((resolve) => {
        finish = () => {
          values.set(key, value)
          resolve()
        }
      }),
  )
  await expect(readServiceSettings()).resolves.toMatchObject({start: '2026-08-01'})
  const settings = {branch: 'army', days: '300', manual: true, start: '2026-09-09'} as const
  const saving = writeServiceSettings(settings)
  await vi.waitFor(() => expect(setItem).toHaveBeenCalled())
  const reading = readServiceSettings()
  finish?.()
  await saving
  await expect(reading).resolves.toEqual(settings)
})
it.each([
  null,
  '{invalid',
  '{"manual":true}',
  JSON.stringify({branch: 'army', days: '', manual: false, start: ''}),
])('should prefer valid web settings over native %s', async (stored) => {
  vi.stubGlobal('ReactNativeWebView', {})
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  localStorage.setItem('pomo:service-settings:v1', JSON.stringify(settings))
  getItem.mockResolvedValue(stored)
  await expect(readServiceSettings()).resolves.toEqual(settings)
})
it('should restore the web copy after a native save fails', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  setItem.mockRejectedValue(new Error('native unavailable'))
  await expect(writeServiceSettings(settings)).rejects.toThrow('native unavailable')
  getItem.mockResolvedValue(null)
  await expect(readServiceSettings()).resolves.toEqual(settings)
})
it.each(['pomo:service-settings:v1', 'pomo:service-start:v1'])(
  'should return a save made during the native read of %s',
  async (key) => {
    vi.stubGlobal('ReactNativeWebView', {})
    const delayed = Promise.withResolvers<string | null>()
    getItem.mockImplementation((requested: string) =>
      requested === key ? delayed.promise : Promise.resolve(null),
    )
    const reading = readServiceSettings()
    await vi.waitFor(() => expect(getItem).toHaveBeenCalledWith(key))
    const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
    await writeServiceSettings(settings)
    delayed.resolve(null)
    await expect(reading).resolves.toEqual(settings)
  },
)
it('should restore the legacy web date when native values are missing', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  getItem.mockResolvedValue(null)
  localStorage.setItem('pomo:service-start:v1', '"2026-09-01"')
  await expect(readServiceSettings()).resolves.toMatchObject({start: '2026-09-01'})
})
it('should restore current native settings before a legacy web date', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  localStorage.setItem('pomo:service-settings:v1', '{invalid')
  localStorage.setItem('pomo:service-start:v1', '"2026-08-01"')
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  getItem.mockResolvedValue(JSON.stringify(settings))
  await expect(readServiceSettings()).resolves.toEqual(settings)
})
it('should retry a stale native read when browser storage is unavailable', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  const delayed = Promise.withResolvers<string | null>()
  getItem.mockReturnValueOnce(delayed.promise).mockResolvedValue(JSON.stringify(settings))
  const reading = readServiceSettings()
  await vi.waitFor(() => expect(getItem).toHaveBeenCalled())
  await writeServiceSettings(settings)
  delayed.resolve(null)
  await expect(reading).resolves.toEqual(settings)
})
it('should preserve native read errors when there is no web copy', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  getItem.mockRejectedValue(new Error('read failed'))
  await expect(readServiceSettings()).rejects.toThrow('read failed')
})
it('should return a concurrent save even when the old native read rejects', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const delayed = Promise.withResolvers<string | null>()
  getItem.mockReturnValueOnce(delayed.promise)
  const reading = readServiceSettings()
  await vi.waitFor(() => expect(getItem).toHaveBeenCalled())
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await writeServiceSettings(settings)
  delayed.reject(new Error('read failed'))
  await expect(reading).resolves.toEqual(settings)
})
it('should restore the native save when replacing an existing web copy fails', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  localStorage.setItem('pomo:service-settings:v1', JSON.stringify({...settings, days: '200'}))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })
  getItem.mockResolvedValue(JSON.stringify(settings))
  await writeServiceSettings(settings)
  await expect(readServiceSettings()).resolves.toEqual(settings)
})

it('should preserve the existing web copy when both writes fail', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  localStorage.setItem('pomo:service-settings:v1', JSON.stringify(previous))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  setItem.mockRejectedValue(new Error('native failed'))
  await expect(writeServiceSettings(next)).rejects.toThrow('native failed')
  await expect(readServiceSettings()).resolves.toEqual(previous)
})
it('should wait for native persistence before restoring after web replacement fails', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  localStorage.setItem('pomo:service-settings:v1', JSON.stringify(previous))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const delayed = Promise.withResolvers<void>()
  setItem.mockReturnValue(delayed.promise)
  getItem.mockResolvedValue(JSON.stringify(next))
  const saving = writeServiceSettings(next)
  const reading = readServiceSettings()
  delayed.resolve()
  await saving
  await expect(reading).resolves.toEqual(next)
})
it('should retain a newer web save after an older native write completes', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  const webWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('blocked')
  })
  const delayed = Promise.withResolvers<void>()
  setItem.mockReturnValueOnce(delayed.promise).mockResolvedValue(undefined)
  const first = writeServiceSettings(previous)
  await vi.waitFor(() => expect(setItem).toHaveBeenCalled())
  webWrite.mockRestore()
  const second = writeServiceSettings(next)
  delayed.resolve()
  await Promise.all([first, second])
  expect(localStorage.getItem('pomo:service-settings:v1')).toBe(JSON.stringify(next))
  await expect(readServiceSettings()).resolves.toEqual(next)
})
it('should report an error if a readable stale web copy cannot be removed', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  localStorage.setItem('pomo:service-settings:v1', JSON.stringify(previous))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  await expect(writeServiceSettings(next)).rejects.toThrow('Failed to discard stale')
})
