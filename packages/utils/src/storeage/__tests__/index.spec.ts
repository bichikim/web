/**
 * @jest-environment jsdom
 */
import {createStorage} from '../'

describe('createStorage', () => {
  it('should create local storage', () => {
    const storage = createStorage('local')

    storage.set('key1', 'value1')
    expect(storage.get('key1')).toBe('value1')
  })
  it('should create session storage', () => {
    const storage = createStorage('session')

    storage.set('key1', 'value1')
    expect(storage.get('key1')).toBe('value1')
  })
  it('should create cookie storage', () => {
    const storage = createStorage('cookie')

    storage.set('key1', 'value1')
    expect(storage.get('key1')).toBe('value1')
  })
  it('should create storage', () => {
    const storage = createStorage('cookie')

    expect(storage.get('key1')).toBe('value1')
  })
})
