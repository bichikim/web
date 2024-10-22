/**
 * @vitest-environment happy-dom
 */
import {storage} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('createStorage', () => {
  it('should create local storage', () => {
    const _storage = storage('local')

    _storage.set('key1', 'value1')
    expect(_storage.get('key1')).toBe('value1')
  })
  it('should create session storage', () => {
    const _storage = storage('session')

    _storage.set('key1', 'value1')
    expect(_storage.get('key1')).toBe('value1')
  })
  it('should create cookie storage', () => {
    const _storage = storage('cookie')

    _storage.set('key1', 'value1')
    expect(_storage.get('key1')).toBe('value1')
  })
  it('should create storage', () => {
    const _storage = storage('cookie')

    expect(_storage.get('key1')).toBe('value1')
  })
})
