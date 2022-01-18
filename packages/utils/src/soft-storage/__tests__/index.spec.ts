/**
 * @jest-environment jsdom
 */
import {cookieSoftStorage, localSoftStorage, sessionSoftStorage} from '..'
import cookie from 'js-cookie'
describe('storage', () => {
  let originalLocalStorage: any
  let originalSessionStorage: any
  let originalSessionStorageSet: any
  let originalSessionStorageGet: any
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  }
  const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  }

  beforeEach(() => {
    originalLocalStorage = window.localStorage
    originalSessionStorage = window.sessionStorage
    originalSessionStorageSet = cookie.set
    originalSessionStorageGet = cookie.get
    cookie.set = jest.fn()
    cookie.get = jest.fn()
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    })
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
    })
  })

  afterEach(() => {
    cookie.set = originalSessionStorageSet
    cookie.get = originalSessionStorageGet
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
    })
    Object.defineProperty(window, 'localStorage', {
      value: originalSessionStorage,
    })
    mockLocalStorage.getItem.mockRestore()
    mockLocalStorage.setItem.mockRestore()
    mockSessionStorage.getItem.mockRestore()
    mockSessionStorage.setItem.mockRestore()
  })

  describe('localSoftStorage', () => {
    it('should set Data', () => {
      localSoftStorage.setItem('foo', {
        name: 'foo',
      })

      expect(mockLocalStorage.setItem).toBeCalledWith('foo', '{"name":"foo"}')
    })
    it('should get Data', () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => '{"name":"foo"}')
      const result = localSoftStorage.getItem('foo')
      expect(result).toEqual({name: 'foo'})
    })
  })
  describe('sessionSoftStorage', () => {
    it('should set Data', () => {
      sessionSoftStorage.setItem('foo', {
        name: 'foo',
      })

      expect(mockSessionStorage.setItem).toBeCalledWith('foo', '{"name":"foo"}')
    })
    it('should get Data', () => {
      mockSessionStorage.getItem.mockImplementationOnce(() => '{"name":"foo"}')
      const result = sessionSoftStorage.getItem('foo')
      expect(result).toEqual({name: 'foo'})
    })
  })
  describe('cookie', () => {
    it('should set Data', () => {

      cookieSoftStorage.setItem('foo', {
        name: 'foo',
      })
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(cookie.set).toBeCalledWith('foo', '{"name":"foo"}', undefined)
    })
    it('should get Data', () => {
      (cookie.get as any).mockImplementationOnce(() => '{"name":"foo"}')
      const result = cookieSoftStorage.getItem('foo')
      expect(result).toEqual({name: 'foo'})
    })
  })
})
