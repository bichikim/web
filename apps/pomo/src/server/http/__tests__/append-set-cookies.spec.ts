/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'
import {appendSetCookies} from '../append-set-cookies'

describe('appendSetCookies', () => {
  it('should retain existing headers and append duplicate cookies in order', () => {
    const headers = new Headers({
      'Set-Cookie': 'existing=1; Path=/',
      'X-Existing': 'value',
    })
    const cookies = Object.freeze([
      'session=first; HttpOnly',
      'session=second; HttpOnly',
      'session=first; HttpOnly',
    ])

    expect(appendSetCookies(headers, cookies)).toBeUndefined()

    expect(headers.getSetCookie()).toEqual(['existing=1; Path=/', ...cookies])
    expect(headers.get('X-Existing')).toBe('value')
  })

  it('should preserve an expiration comma within one cookie', () => {
    const headers = new Headers()
    const cookie = 'session=expired; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'

    appendSetCookies(headers, [cookie, 'other=1; Path=/'])

    expect(headers.getSetCookie()).toEqual([cookie, 'other=1; Path=/'])
  })

  it('should leave headers untouched without reading append for an empty list', () => {
    const headers = new Headers({'X-Existing': 'value'})
    const readAppend = vi.fn(() => {
      throw new Error('append must not be read')
    })
    Object.defineProperty(headers, 'append', {get: readAppend})

    appendSetCookies(headers, [])

    expect(readAppend).not.toHaveBeenCalled()
    expect([...headers]).toEqual([['x-existing', 'value']])
  })

  it('should preserve partial mutation and close iteration when append fails', () => {
    const headers = new Headers()
    const closed = vi.fn()
    const cookies = ['first=1', 'invalid=1\n2', 'last=1']
    cookies[Symbol.iterator] = function* readInvalidCookies(): Generator<string, undefined> {
      try {
        yield* ['first=1', 'invalid=1\n2', 'last=1']
      } finally {
        closed()
      }
      return undefined
    }

    expect(() => appendSetCookies(headers, cookies)).toThrow(TypeError)

    expect(headers.getSetCookie()).toEqual(['first=1'])
    expect(closed).toHaveBeenCalledOnce()
  })

  it('should retain the append receiver and observe method replacement between cookies', () => {
    const headers = new Headers()
    const nativeAppend = headers.append
    const laterAppend = vi.fn(function laterAppend(this: Headers, name: string, value: string) {
      expect(this).toBe(headers)
      nativeAppend.call(this, name, value)
    })
    const firstAppend = vi.fn(function firstAppend(this: Headers, name: string, value: string) {
      expect(this).toBe(headers)
      nativeAppend.call(this, name, value)
      this.append = laterAppend
    })
    headers.append = firstAppend

    appendSetCookies(headers, ['first=1', 'second=2'])

    expect(firstAppend).toHaveBeenCalledOnce()
    expect(laterAppend).toHaveBeenCalledExactlyOnceWith('Set-Cookie', 'second=2')
    expect(headers.getSetCookie()).toEqual(['first=1', 'second=2'])
  })

  it('should propagate an append getter failure without consuming later cookies', () => {
    const headers = new Headers()
    const error = new Error('getter failed')
    const visited: string[] = []
    const cookies = ['first=1', 'last=1']
    cookies[Symbol.iterator] = function* readObservedCookies(): Generator<string, undefined> {
      for (const cookie of ['first=1', 'last=1']) {
        visited.push(cookie)
        yield cookie
      }
      return undefined
    }
    Object.defineProperty(headers, 'append', {
      get: () => {
        throw error
      },
    })

    let caught: unknown
    try {
      appendSetCookies(headers, cookies)
    } catch (failure) {
      caught = failure
    }

    expect(caught).toBe(error)
    expect(visited).toEqual(['first=1'])
  })

  it('should retain reentrant append ordering on the same headers', () => {
    const headers = new Headers()
    const nativeAppend = headers.append
    headers.append = function append(name, value) {
      nativeAppend.call(this, name, value)
      if (value === 'outer=1') {
        appendSetCookies(this, ['inner=1'])
      }
    }

    appendSetCookies(headers, ['outer=1', 'outer=2'])

    expect(headers.getSetCookie()).toEqual(['outer=1', 'inner=1', 'outer=2'])
  })
})
