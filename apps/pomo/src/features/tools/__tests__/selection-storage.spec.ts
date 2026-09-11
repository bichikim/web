/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  lunarDirectionStorage,
  movingSelectionStorage,
  type SelectionStorage,
  unitSelectionStorage,
} from '../selection-storage'
const {getItem, setItem} = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem, setItem}}))
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  vi.resetAllMocks()
})
describe('selection storage integration', () => {
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
})

const testNativeRestoration = <Value>(
  storage: SelectionStorage<Value>,
  key: string,
  older: NoInfer<Value>,
  latest: NoInfer<Value>,
) => {
  const {read, write} = storage
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
      await expect(write(latest)).rejects.toThrow('browser removal failed')
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
    const response = Promise.withResolvers<string | null>()
    setItem.mockReturnValueOnce(first.promise)
    getItem.mockReturnValueOnce(response.promise).mockResolvedValue(JSON.stringify(latest))
    const saving = write(older)
    const reading = read()
    const updating = write(latest)
    first.resolve()
    await Promise.all([saving, updating])
    response.resolve(JSON.stringify(older))
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
}

describe('unitSelectionStorage', () => {
  testNativeRestoration(
    unitSelectionStorage,
    'pomo:tool-units:v1',
    {category: 'length', from: 'm', to: 'km'},
    {category: 'area', from: 'pyeong', to: 'm2'},
  )
})
describe('lunarDirectionStorage', () => {
  testNativeRestoration(lunarDirectionStorage, 'pomo:tool-lunar-direction:v1', 'solar', 'lunar')
})
describe('movingSelectionStorage', () => {
  testNativeRestoration(
    movingSelectionStorage,
    'pomo:tool-moving:v1',
    {month: '4', year: '2026'},
    {month: '5', year: '2027'},
  )
})
