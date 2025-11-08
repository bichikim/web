import {describe, expect, it} from 'vitest'
import {createGetId} from './get-id'

describe('get-id', () => {
  it('should return a string', () => {
    const getId = createGetId()

    expect(getId()).toBe('0')
    expect(getId()).toBe('1')
  })

  it('should handle overflow max safe integer', () => {
    const getId = createGetId(Number.MAX_SAFE_INTEGER)

    expect(getId()).toBe(`${Number.MAX_SAFE_INTEGER}`)
    expect(getId()).toBe(`0,${Number.MAX_SAFE_INTEGER}`)
    expect(getId()).toBe(`1,${Number.MAX_SAFE_INTEGER}`)
  })
})
