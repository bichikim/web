/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {renderHook, waitFor} from '@solidjs/testing-library'
import * as cookieUtils from 'src/utils/cookie'
import {useCookieStorage, useClientStorage, useStorage} from '../'

// Mock cookie utilities
vi.mock('src/utils/cookie', () => ({
  getClientCookie: vi.fn(),
  getServerCookie: vi.fn(),
  setClientCookie: vi.fn(),
  setServerCookie: vi.fn(),
}))

const isServerMock = vi.hoisted(() => ({value: false}))

// Mock Solid's SSR flag
vi.mock('solid-js/web', async () => {
  const actual = await vi.importActual<typeof import('solid-js/web')>('solid-js/web')

  return {
    ...actual,
    get isServer() {
      return isServerMock.value
    },
  }
})

describe('useCookieStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isServerMock.value = false
  })

  it('should initialize with initValue when cookie does not exist', () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', 'default-value'))

    expect(result[0]()).toBe('default-value')
    cleanup()
  })

  it('should initialize with cookie value when cookie exists', () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue('cookie-value')

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', 'default-value'))

    expect(result[0]()).toBe('cookie-value')
    cleanup()
  })

  it('should deserialize JSON cookie value', () => {
    const jsonValue = {count: 42, name: 'test'}

    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(JSON.stringify(jsonValue))

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', {}))

    expect(result[0]()).toEqual(jsonValue)
    cleanup()
  })

  it('should serialize and save value to cookie when value changes', async () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', 'init'))

    result[1]('new-value')

    await waitFor(() => {
      expect(cookieUtils.setClientCookie).toHaveBeenCalledWith('test-key', 'new-value', undefined)
    })
    cleanup()
  })

  it('should serialize object value to JSON', async () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', {}))

    const newValue = {count: 42, name: 'test'}

    result[1](newValue)

    await waitFor(() => {
      expect(cookieUtils.setClientCookie).toHaveBeenCalledWith('test-key', JSON.stringify(newValue), undefined)
    })
    cleanup()
  })

  it('should use cookie options when provided', async () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const options = {maxAge: 3600, path: '/'}
    const optionsAccessor = () => options

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', 'init', optionsAccessor))

    result[1]('new-value')

    await waitFor(() => {
      expect(cookieUtils.setClientCookie).toHaveBeenCalledWith('test-key', 'new-value', options)
    })
    cleanup()
  })

  it('should use server cookie utilities when isServer is true', async () => {
    isServerMock.value = true
    vi.mocked(cookieUtils.getServerCookie).mockReturnValue(undefined)

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', 'init'))

    expect(cookieUtils.getServerCookie).toHaveBeenCalledWith('test-key')
    expect(result[0]()).toBe('init')
    result[1]('new-value')

    await waitFor(() => {
      expect(cookieUtils.setServerCookie).toHaveBeenCalledWith('test-key', 'new-value', undefined)
      expect(cookieUtils.setClientCookie).not.toHaveBeenCalled()
    })
    cleanup()
  })

  it('should fall back to String(value) when cookie serialization fails', async () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const {result, cleanup} = renderHook(() => useCookieStorage('test-key', {}))

    const circular: Record<string, unknown> = {}

    circular.self = circular
    result[1](circular)

    await waitFor(() => {
      expect(cookieUtils.setClientCookie).toHaveBeenCalledWith('test-key', String(circular), undefined)
    })
    cleanup()
  })
})

describe('useClientStorage', () => {
  let localStorageMock: Storage
  let sessionStorageMock: Storage

  beforeEach(() => {
    isServerMock.value = false

    localStorageMock = {
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      length: 0,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }

    sessionStorageMock = {
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      length: 0,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with initValue when localStorage is empty', async () => {
    vi.mocked(localStorageMock.getItem).mockReturnValue(null)

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', 'default-value'))

    await waitFor(() => {
      expect(result[0]()).toBe('default-value')
    })
    cleanup()
  })

  it('should load value from localStorage on mount', async () => {
    const storedValue = 'stored-value'

    vi.mocked(localStorageMock.getItem).mockReturnValue(storedValue)

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', 'default-value'))

    await waitFor(() => {
      expect(result[0]()).toBe(storedValue)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
    })
    cleanup()
  })

  it('should load and deserialize JSON value from localStorage', async () => {
    const storedValue = {count: 42, name: 'test'}

    vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify(storedValue))

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', {}))

    await waitFor(() => {
      expect(result[0]()).toEqual(storedValue)
    })
    cleanup()
  })

  it('should save value to localStorage when value changes', async () => {
    vi.mocked(localStorageMock.getItem).mockReturnValue(null)

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', 'init'))

    await waitFor(() => {
      expect(result[0]()).toBe('init')
    })
    result[1]('new-value')

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', 'new-value')
    })
    cleanup()
  })

  it('should serialize and save object value to localStorage', async () => {
    vi.mocked(localStorageMock.getItem).mockReturnValue(null)

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', {}))

    await waitFor(() => {
      expect(result[0]()).toEqual({})
    })

    const newValue = {count: 42, name: 'test'}

    result[1](newValue)

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(newValue))
    })
    cleanup()
  })

  it('should use sessionStorage when kind is session', async () => {
    vi.mocked(sessionStorageMock.getItem).mockReturnValue(null)

    const {result, cleanup} = renderHook(() => useClientStorage('session', 'test-key', 'init'))

    await waitFor(() => {
      expect(result[0]()).toBe('init')
    })
    result[1]('new-value')

    await waitFor(() => {
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('test-key', 'new-value')
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
    cleanup()
  })

  it('should not overwrite storage with initValue on initial mount', async () => {
    const storedValue = 'existing-value'

    vi.mocked(localStorageMock.getItem).mockReturnValue(storedValue)

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', 'init-value'))

    await waitFor(() => {
      expect(result[0]()).toBe(storedValue)
      // Should not set initValue to storage
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('test-key', 'init-value')
    })
    cleanup()
  })

  it('should not touch client storage when isServer is true', async () => {
    isServerMock.value = true
    vi.mocked(localStorageMock.getItem).mockReturnValue('stored-value')

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', 'default-value'))

    await waitFor(() => {
      expect(result[0]()).toBe('default-value')
    })
    expect(localStorageMock.getItem).not.toHaveBeenCalled()
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
    cleanup()
  })

  it('should fall back to String(value) when localStorage serialization fails', async () => {
    vi.mocked(localStorageMock.getItem).mockReturnValue(null)

    const {result, cleanup} = renderHook(() => useClientStorage('local', 'test-key', {}))

    await waitFor(() => {
      expect(result[0]()).toEqual({})
    })

    const circular: Record<string, unknown> = {}

    circular.self = circular
    result[1](circular)

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', String(circular))
    })
    cleanup()
  })
})

describe('useStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isServerMock.value = false
  })

  it('should use cookie storage when kind is cookie', () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const {result, cleanup} = renderHook(() => useStorage('cookie', 'test-key', 'default-value'))

    expect(result[0]()).toBe('default-value')
    cleanup()
  })

  it('should use localStorage when kind is local', async () => {
    const localStorageMock = {
      clear: vi.fn(),
      getItem: vi.fn().mockReturnValue(null),
      key: vi.fn(),
      length: 0,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    const {result, cleanup} = renderHook(() => useStorage('local', 'test-key', 'default-value'))

    await waitFor(() => {
      expect(result[0]()).toBe('default-value')
    })
    cleanup()
  })

  it('should use sessionStorage when kind is session', async () => {
    const sessionStorageMock = {
      clear: vi.fn(),
      getItem: vi.fn().mockReturnValue(null),
      key: vi.fn(),
      length: 0,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    })

    const {result, cleanup} = renderHook(() => useStorage('session', 'test-key', 'default-value'))

    await waitFor(() => {
      expect(result[0]()).toBe('default-value')
    })
    cleanup()
  })

  it('should pass options to cookie storage', async () => {
    vi.mocked(cookieUtils.getClientCookie).mockReturnValue(undefined)

    const options = {maxAge: 3600, path: '/'}
    const optionsAccessor = () => options

    const {result, cleanup} = renderHook(() => useStorage('cookie', 'test-key', 'init', optionsAccessor))

    result[1]('new-value')

    await waitFor(() => {
      expect(cookieUtils.setClientCookie).toHaveBeenCalledWith('test-key', 'new-value', options)
    })
    cleanup()
  })
})
