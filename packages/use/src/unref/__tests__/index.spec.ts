import {ref} from 'vue'
import {unref} from '../'

describe('unref', () => {
  it('should return value', () => {
    expect(unref(undefined)).toBe(undefined)
    expect(unref('foo')).toBe('foo')
  })
  it('should return value with ref', () => {
    expect(unref(ref(undefined))).toBe(undefined)
    expect(unref(ref('foo'))).toBe('foo')
  })
})
