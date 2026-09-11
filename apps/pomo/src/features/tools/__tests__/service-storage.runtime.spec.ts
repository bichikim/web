/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {readServiceSettings, writeServiceSettings} from '../service-storage'

const {getItem, setItem} = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem, setItem}}))
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  vi.resetAllMocks()
})
describe('service settings restoration', () => {
  it('should restore custom duration and mode along with the date and branch', async () => {
    const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
    await writeServiceSettings(settings)
    await expect(readServiceSettings()).resolves.toEqual(settings)
    expect(JSON.parse(localStorage.getItem('pomo:service-settings:v1') ?? 'null')).toEqual(settings)
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
})

describe('native storage reconciliation', () => {
  const {key, read, write, older, latest} = {
    key: 'pomo:service-settings:v1',
    latest: {branch: 'navy', days: '300', manual: true, start: '2026-09-01'},
    older: {branch: 'army', days: '', manual: false, start: '2026-08-01'},
    read: readServiceSettings,
    write: writeServiceSettings,
  } as const

  it.each([
    {error: null, name: 'empty', value: null},
    {error: null, name: 'invalid', value: '{'},
    {error: new Error('native read failed'), name: 'failure', value: null},
    {error: null, name: 'stale', value: JSON.stringify(older)},
  ])('should preserve browser settings with $name native storage', async ({value, error}) => {
    vi.stubGlobal('ReactNativeWebView', {})
    localStorage.setItem(key, JSON.stringify(latest))
    if (error === null) {
      getItem.mockResolvedValue(value)
    } else {
      getItem.mockRejectedValue(error)
    }
    await expect(read()).resolves.toEqual(latest)
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(latest)
  })
  it(`should restore browser settings after a failed native write`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    getItem.mockResolvedValue(JSON.stringify(older))
    setItem.mockRejectedValue(new Error('native write failed'))
    await expect(write(latest)).rejects.toThrow('native write failed')
    await expect(read()).resolves.toEqual(latest)
  })
  it.each([false, true])(
    `should return a concurrent browser write when native read rejects=%s`,
    async (reject) => {
      vi.stubGlobal('ReactNativeWebView', {})
      const response = Promise.withResolvers<string | null>()
      getItem.mockReturnValue(response.promise)
      const reading = read()
      await vi.waitFor(() => expect(getItem).toHaveBeenCalledWith(key))
      await write(latest)
      if (reject) {
        response.reject(new Error('native read failed'))
      } else {
        response.resolve(JSON.stringify(older))
      }
      await expect(reading).resolves.toEqual(latest)
      expect(JSON.parse(localStorage.getItem(key)!)).toEqual(latest)
    },
  )
  it(`should return the latest browser settings while an earlier native write finishes`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    setItem.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    getItem.mockResolvedValue(JSON.stringify(older))
    const saving = write(older)
    await vi.waitFor(() => expect(setItem).toHaveBeenCalledTimes(1))
    const reading = read()
    const updating = write(latest)
    first.resolve()
    second.resolve()
    await saving
    try {
      await expect(reading).resolves.toEqual(latest)
    } finally {
      second.resolve()
      await updating
    }
  })
  it(`should restore a successful native write when the browser write fails`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    localStorage.setItem(key, JSON.stringify(older))
    const browserWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('browser quota exceeded')
    })
    getItem.mockResolvedValue(JSON.stringify(latest))
    try {
      await write(latest)
      expect(localStorage.getItem(key)).toBeNull()
      await expect(read()).resolves.toEqual(latest)
    } finally {
      browserWrite.mockRestore()
    }
  })
  it(`should retain the browser copy when both writes fail`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    localStorage.setItem(key, JSON.stringify(older))
    const browserWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('browser write failed')
    })
    setItem.mockRejectedValue(new Error('native write failed'))
    try {
      await expect(write(latest)).rejects.toThrow('native write failed')
      await expect(read()).resolves.toEqual(older)
    } finally {
      browserWrite.mockRestore()
    }
  })
  it(`should preserve a newer browser write when a native-only save finishes`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    const browserWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('browser write failed')
    })
    const response = Promise.withResolvers<void>()
    setItem.mockReturnValueOnce(response.promise)
    try {
      const saving = write(older)
      const updating = write(latest)
      response.resolve()
      await Promise.all([saving, updating])
      expect(localStorage.getItem(key)).toBe(JSON.stringify(latest))
      await expect(read()).resolves.toEqual(latest)
    } finally {
      response.resolve()
      browserWrite.mockRestore()
    }
  })
  it(`should reject when an obsolete browser copy cannot be removed`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    localStorage.setItem(key, JSON.stringify(older))
    const browserWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('browser write failed')
    })
    const browserRemove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('browser removal failed')
    })
    try {
      await expect(write(latest)).rejects.toThrow('Failed to discard stale')
      await expect(read()).resolves.toEqual(older)
    } finally {
      browserWrite.mockRestore()
      browserRemove.mockRestore()
    }
  })
  it(`should detect a native-only write queued while waiting for an earlier save`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    vi.stubGlobal('localStorage', undefined)
    const first = Promise.withResolvers<void>()
    let stored = JSON.stringify(older)
    setItem
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(async (_key: string, value: string) => {
        stored = value
      })
    getItem.mockImplementation(() => Promise.resolve(stored))
    const saving = write(older)
    const reading = read()
    const updating = write(latest)
    first.resolve()
    await Promise.all([saving, updating])
    await expect(reading).resolves.toEqual(latest)
  })
  it(`should restore native settings when browser storage is unavailable`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    vi.stubGlobal('localStorage', undefined)
    getItem.mockResolvedValue(JSON.stringify(latest))
    await write(latest)
    await expect(read()).resolves.toEqual(latest)
  })
  it(`should re-read native settings after a concurrent native-only save`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    vi.stubGlobal('localStorage', undefined)
    const response = Promise.withResolvers<string | null>()
    getItem.mockReturnValueOnce(response.promise).mockResolvedValue(JSON.stringify(latest))
    const reading = read()
    await vi.waitFor(() => expect(getItem).toHaveBeenCalledWith(key))
    await write(latest)
    response.resolve(JSON.stringify(older))
    await expect(reading).resolves.toEqual(latest)
  })
  it(`should restore native settings when browser settings are absent`, async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    getItem.mockResolvedValue(JSON.stringify(latest))
    await expect(read()).resolves.toEqual(latest)
  })
})

describe('legacy date restoration', () => {
  it('should preserve browser legacy dates when native storage is empty or fails', async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    localStorage.setItem('pomo:service-start:v1', '"2026-09-01"')
    getItem.mockResolvedValue(null)
    await expect(readServiceSettings()).resolves.toMatchObject({start: '2026-09-01'})
    getItem.mockRejectedValue(new Error('native unavailable'))
    await expect(readServiceSettings()).resolves.toMatchObject({start: '2026-09-01'})
  })
  it('should return new settings written during the native legacy date lookup', async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    const response = Promise.withResolvers<string | null>()
    getItem.mockResolvedValueOnce(null).mockReturnValueOnce(response.promise)
    const reading = readServiceSettings()
    await vi.waitFor(() => expect(getItem).toHaveBeenCalledWith('pomo:service-start:v1'))
    const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
    await writeServiceSettings(settings)
    response.resolve('"2026-08-01"')
    await expect(reading).resolves.toEqual(settings)
  })

  it('should re-read native settings after a native-only save during legacy lookup', async () => {
    vi.stubGlobal('ReactNativeWebView', {})
    vi.stubGlobal('localStorage', undefined)
    const response = Promise.withResolvers<string | null>()
    const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
    getItem
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(response.promise)
      .mockResolvedValue(JSON.stringify(settings))
    const reading = readServiceSettings()
    await vi.waitFor(() => expect(getItem).toHaveBeenCalledWith('pomo:service-start:v1'))
    await writeServiceSettings(settings)
    response.resolve('"2026-08-01"')
    await expect(reading).resolves.toEqual(settings)
  })
})
