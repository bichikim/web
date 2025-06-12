/**
 * @vitest-environment jsdom
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {deleteCookie, getCookie, setCookie} from './index'
import jsCookie from 'js-cookie'

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    remove: vi.fn(),
    set: vi.fn(),
  },
}))

// Mock vinxi/http
vi.mock('vinxi/http', () => ({
  deleteCookie: vi.fn(),
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('cookie utils', () => {
  it('should set cookie in client environment', () => {
    setCookie('test', 'value')
    expect(jsCookie.set).toHaveBeenCalledWith('test', 'value', {})
  })

  it('should set cookie with options in client environment', () => {
    const options = {
      domain: 'example.com',
      expires: new Date(),
      path: '/',
      sameSite: 'strict' as const,
      secure: true,
    }

    setCookie('test', 'value', options)
    expect(jsCookie.set).toHaveBeenCalledWith('test', 'value', options)
  })

  it('should get cookie in client environment', () => {
    getCookie('test')
    expect(jsCookie.get).toHaveBeenCalledWith('test')
  })

  it('should delete cookie in client environment', () => {
    deleteCookie('test')
    expect(jsCookie.remove).toHaveBeenCalledWith('test', {})
  })

  it('should delete cookie with options in client environment', () => {
    const options = {
      domain: 'example.com',
      path: '/',
    }

    deleteCookie('test', options)
    expect(jsCookie.remove).toHaveBeenCalledWith('test', options)
  })
})
