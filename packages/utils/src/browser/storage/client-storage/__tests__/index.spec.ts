/**
 * @vitest-environment jsdom
 */
import {beforeEach, describe, expect, it} from 'vitest'
import {createClientStorage, getCookieItem} from '../'

describe('createClientStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = 'key1=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
    document.cookie = 'empty=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
  })

  it('should create local storage', () => {
    const clientStorage = createClientStorage('local')

    clientStorage.set('key1', 'value1')
    expect(clientStorage.get('key1')).toBe('value1')
  })

  it('should create session storage', () => {
    const clientStorage = createClientStorage('session')

    clientStorage.set('key1', 'value1')
    expect(clientStorage.get('key1')).toBe('value1')
  })

  it('should create cookie storage', () => {
    const clientStorage = createClientStorage('cookie')

    clientStorage.set('key1', 'value1')
    expect(clientStorage.get('key1')).toBe('value1')
  })

  it('should return the default value when storage is empty', () => {
    const clientStorage = createClientStorage('cookie', {defaultValue: 'fallback'})

    expect(clientStorage.get('key1')).toBe('fallback')
  })

  it('should apply the factory raw default to get and set', () => {
    const clientStorage = createClientStorage<string>('local', {defaultValue: 'fallback'}, true)

    expect(clientStorage.get('missing')).toBe('fallback')

    clientStorage.set('key', 'value')

    expect(localStorage.getItem('key')).toBe('value')
    expect(clientStorage.get('key')).toBe('value')
  })

  it('should preserve an empty raw cookie value', () => {
    document.cookie = 'empty='

    expect(getCookieItem('empty', 'fallback', true)).toBe('')
  })
})
