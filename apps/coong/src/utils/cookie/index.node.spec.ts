/**
 * @vitest-environment node
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {deleteCookie, getCookie, setCookie} from './index'
import {
  deleteCookie as deleteServerCookie,
  getCookie as getServerCookie,
  setCookie as setServerCookie,
} from 'vinxi/http'

vi.mock('solid-js/web', () => ({
  isServer: true,
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

describe('cookie utils in node environment', () => {
  it('should set cookie in server environment', () => {
    setCookie('test', 'value')
    expect(setServerCookie).toHaveBeenCalledWith('test', 'value', undefined)
  })

  it('should set cookie with options in server environment', () => {
    const options = {
      domain: 'example.com',
      expires: new Date(),
      path: '/',
      sameSite: 'strict' as const,
      secure: true,
    }

    setCookie('test', 'value', options)
    expect(setServerCookie).toHaveBeenCalledWith('test', 'value', options)
  })

  it('should get cookie in server environment', () => {
    getCookie('test')
    expect(getServerCookie).toHaveBeenCalledWith('test')
  })

  it('should delete cookie in server environment', () => {
    deleteCookie('test')
    expect(deleteServerCookie).toHaveBeenCalledWith('test', undefined)
  })

  it('should delete cookie with options in server environment', () => {
    const options = {
      domain: 'example.com',
      path: '/',
    }

    deleteCookie('test', options)
    expect(deleteServerCookie).toHaveBeenCalledWith('test', options)
  })
})
