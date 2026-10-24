/**
 * @vitest-environment jsdom
 */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import jsCookie from 'js-cookie'
import * as startHttp from '@solidjs/start/http'
import {getClientCookie, getServerCookie, setClientCookie, setServerCookie} from '../'

vi.mock('js-cookie')
vi.mock('@solidjs/start/http', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}))

describe('cookie utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setClientCookie', () => {
    it('should set cookie with name and value', () => {
      setClientCookie('test-cookie', 'test-value')

      expect(jsCookie.set).toHaveBeenCalledWith('test-cookie', 'test-value', {
        domain: undefined,
        expires: undefined,
        httpOnly: undefined,
        maxAge: undefined,
        path: undefined,
        priority: undefined,
        sameSite: undefined,
        secure: undefined,
      })
    })

    it('should set cookie with all options', () => {
      const options: any = {
        domain: '.example.com',
        expires: new Date('2024-12-31'),
        httpOnly: true,
        maxAge: 3600,
        path: '/',
        priority: 'high',
        sameSite: 'strict',
        secure: true,
      }

      setClientCookie('test-cookie', 'test-value', options)

      expect(jsCookie.set).toHaveBeenCalledWith('test-cookie', 'test-value', {
        domain: '.example.com',
        expires: options.expires,
        httpOnly: true,
        maxAge: 3600,
        path: '/',
        priority: 'high',
        sameSite: 'strict',
        secure: true,
      })
    })

    it('should normalize sameSite true to strict', () => {
      setClientCookie('test-cookie', 'test-value', {sameSite: true})

      expect(jsCookie.set).toHaveBeenCalledWith(
        'test-cookie',
        'test-value',
        expect.objectContaining({
          sameSite: 'strict',
        }),
      )
    })

    it('should normalize sameSite false to none', () => {
      setClientCookie('test-cookie', 'test-value', {sameSite: false})

      expect(jsCookie.set).toHaveBeenCalledWith(
        'test-cookie',
        'test-value',
        expect.objectContaining({
          sameSite: 'none',
        }),
      )
    })

    it('should preserve sameSite string values', () => {
      setClientCookie('test-cookie', 'test-value', {sameSite: 'lax'})

      expect(jsCookie.set).toHaveBeenCalledWith(
        'test-cookie',
        'test-value',
        expect.objectContaining({
          sameSite: 'lax',
        }),
      )
    })

    it('should handle undefined sameSite', () => {
      setClientCookie('test-cookie', 'test-value', {sameSite: undefined})

      expect(jsCookie.set).toHaveBeenCalledWith(
        'test-cookie',
        'test-value',
        expect.objectContaining({
          sameSite: undefined,
        }),
      )
    })

    it('should handle partial options', () => {
      setClientCookie('test-cookie', 'test-value', {path: '/admin', secure: true})

      expect(jsCookie.set).toHaveBeenCalledWith('test-cookie', 'test-value', {
        domain: undefined,
        expires: undefined,
        httpOnly: undefined,
        maxAge: undefined,
        path: '/admin',
        priority: undefined,
        sameSite: undefined,
        secure: true,
      })
    })
  })

  describe('getClientCookie', () => {
    it('should get cookie value', () => {
      vi.mocked(jsCookie.get).mockReturnValue('cookie-value' as any)

      const result = getClientCookie('test-cookie')

      expect(jsCookie.get).toHaveBeenCalledWith('test-cookie')
      expect(result).toBe('cookie-value')
    })

    it('should return undefined when cookie does not exist', () => {
      vi.mocked(jsCookie.get).mockReturnValue(undefined as any)

      const result = getClientCookie('non-existent')

      expect(jsCookie.get).toHaveBeenCalledWith('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('setServerCookie', () => {
    it('should call SolidStart setCookie', () => {
      setServerCookie('test-cookie', 'test-value', {path: '/'})
      expect(startHttp.setCookie).toHaveBeenCalledWith('test-cookie', 'test-value', {path: '/'})
    })

    it('should call SolidStart setCookie with options', () => {
      const options: any = {
        domain: '.example.com',
        expires: new Date('2024-12-31'),
        httpOnly: true,
        maxAge: 3600,
        path: '/',
        sameSite: 'strict',
        secure: true,
      }

      setServerCookie('test-cookie', 'test-value', options)
      expect(startHttp.setCookie).toHaveBeenCalledWith('test-cookie', 'test-value', options)
    })

    it('should call SolidStart setCookie without options', () => {
      setServerCookie('test-cookie', 'test-value')
      expect(startHttp.setCookie).toHaveBeenCalledWith('test-cookie', 'test-value', undefined)
    })
  })

  describe('getServerCookie', () => {
    it('should call SolidStart getCookie', () => {
      vi.mocked(startHttp.getCookie).mockReturnValue('cookie-value')

      const result = getServerCookie('test-cookie')

      expect(startHttp.getCookie).toHaveBeenCalledWith('test-cookie')
      expect(result).toBe('cookie-value')
    })

    it('should return undefined when cookie does not exist', () => {
      vi.mocked(startHttp.getCookie).mockReturnValue(undefined)

      const result = getServerCookie('non-existent')

      expect(startHttp.getCookie).toHaveBeenCalledWith('non-existent')
      expect(result).toBeUndefined()
    })
  })
})
