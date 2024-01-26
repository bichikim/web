import {createUidGenerator} from '../'
import {describe, expect, it} from 'vitest'
describe('createUidGenerator', () => {
  it('should return uid', () => {
    const uid = createUidGenerator()
    const result = uid()
    expect(result).toBe('v1')
  })
  it('should return uid with prefix', () => {
    const uid = createUidGenerator('c')
    const result = uid('foo')
    expect(result).toBe('foo-c1')
  })
})
