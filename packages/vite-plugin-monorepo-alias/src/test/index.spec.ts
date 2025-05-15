import {describe, expect, it} from 'vitest'
import {foo} from '#test/foo'

/**
 * test alias test
 */
describe('test', () => {
  it('should be true', () => {
    expect(foo()).toBe('foo')
  })
})
