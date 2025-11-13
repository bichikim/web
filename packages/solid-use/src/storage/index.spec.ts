/**
 * @vitest-environment jsdom
 */

import {afterEach, describe, expect, it, vi} from 'vitest'
import {useStorage} from './'
import {createRoot} from 'solid-js'
import {getAnyStorageItem, setAnyStorageItem} from '@winter-love/utils'

vi.mock('@winter-love/utils', () => ({
  getAnyStorageItem: vi.fn(),
  getStorageItem: vi.fn(),
  setAnyStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
}))

describe('useStorage local', () => {
  afterEach(() => {
    vi.mocked(getAnyStorageItem).mockRestore()
    vi.mocked(setAnyStorageItem).mockRestore()
  })

  it('should return stored data when data exists', () => {
    const key = 'key'
    const storeValue = 'value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key)

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(storeValue)
    dispose()
  })

  it('should return null when data does not exist', () => {
    const key = 'key'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(null)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key)

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(null)
    dispose()
  })

  it('should return initValue when storage is empty but initValue exists', () => {
    const key = 'key'
    const initValue = 'init-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(initValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {initValue})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, initValue)
    expect(value()).toBe(initValue)
    dispose()
  })

  it('should call getAnyStorageItem after mounted when mounted option is true', () => {
    const key = 'key'
    const storeValue = 'store-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {mounted: true})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(storeValue)
    dispose()
  })

  it('should enforce value when enforceValue option exists', () => {
    const key = 'key'
    const enforceValue = 'enforce-value'
    const storeValue = 'store-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {enforceValue})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(enforceValue)
    dispose()
  })

  it('should update and save value to store when setValue is called', () => {
    const key = 'key'
    const storeValue = 'store-value'
    const newValue = 'new-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value, setValue} = createRoot((dispose) => {
      const [value, setValue] = useStorage('local', key)

      return {dispose, setValue, value}
    })

    expect(value()).toBe(storeValue)
    setValue(newValue)
    expect(setAnyStorageItem).toHaveBeenCalledWith('local', key, newValue, {})
    expect(value()).toBe(newValue)
    dispose()
  })
})
