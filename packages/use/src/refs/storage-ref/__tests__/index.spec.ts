/**
 * @vitest-environment jsdom
 */
import {flushPromises} from '@winter-love/test-utils'
import {storage} from '@winter-love/utils'
import {storageRef} from '../'
import {effectScope} from 'vue'
import {beforeEach, describe, expect, it, vi} from 'vitest'
vi.mock('@winter-love/utils', async () => {
  const actual: any = await vi.importActual('@winter-love/utils')
  return {
    ...actual,
    storage: vi.fn(actual.storage),
  }
})

describe('storageRef ', () => {
  beforeEach(() => {
    vi.mocked(storage).mockClear()
  })
  it('should pass options', () => {
    const name = '__foo__'
    const scope = effectScope()
    scope.run(() => {
      storageRef('cookie', name, undefined, {expires: 30})
    })
    expect(storage).toBeCalledWith('cookie', {
      expires: 30,
    })
  })
  it('should save init value with empty localStorage', () => {
    const name = '__foo__'
    const value = 'hello'
    const scope = effectScope()
    scope.run(() => {
      storageRef('local', name, value)
    })

    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    window.localStorage.clear()
  })
  it('should not save init value with filled localStorage', () => {
    const name = '__foo__'
    const value = 'hello'
    const value2 = 'hell'
    window.localStorage.setItem(name, JSON.stringify(value2))
    const scope = effectScope()
    scope.run(() => {
      storageRef('local', name, value)
    })
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value2))
    window.localStorage.clear()
  })
  it('should not save empty init value with filled localStorage', () => {
    const name = '__foo__'
    const value = 'hello'
    window.localStorage.setItem(name, JSON.stringify(value))
    storageRef('local', name, undefined)
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    window.localStorage.clear()
  })
  it('should update value with empty localStorage and empty init value', async () => {
    const name = '__foo__'
    const value = 'hello'
    const valueRef = storageRef<string>('local', name, undefined)
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(null))
    valueRef.value = value
    await flushPromises()
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    window.localStorage.clear()
  })
  it('should update value with empty localStorage and init value', async () => {
    const name = '__foo__'
    const value = 'hello'
    const value2 = 'hell'
    const valueRef = storageRef<string>('local', name, value)
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    valueRef.value = value2
    await flushPromises()
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value2))
    window.localStorage.clear()
  })
  it('should update undefined value with empty localStorage and init value', async () => {
    const name = '__foo__'
    const value = 'hello'
    const valueRef: any = storageRef<string>('local', name, value)
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    valueRef.value = undefined
    await flushPromises()
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(null))
    window.localStorage.clear()
  })
  it('should update null value with empty localStorage and init value', async () => {
    const name = '__foo__'
    const value = 'hello'
    const valueRef = storageRef<string>('local', name, value)
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    valueRef.value = null
    await flushPromises()
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(null))
    window.localStorage.clear()
  })
  it('should restore value', async () => {
    const name = '__foo__'
    const value = 'hello'
    window.localStorage.setItem(name, JSON.stringify(value))
    storageRef<string>('local', name, undefined)
    expect(window.localStorage.getItem(name)).toBe(JSON.stringify(value))
    window.localStorage.clear()
  })
})
