import {toUndefined} from '../'
import {describe, expect, it} from 'vitest'

describe('to-undefined', () => {
  it('should return undefined with null', () => {
    const result = toUndefined(null)

    expect(result).toBeUndefined()
  })

  it('should return undefined with undefined', () => {
    const result = toUndefined(undefined)

    expect(result).toBeUndefined()
  })

  it('should return undefined with any others', () => {
    const result = toUndefined(555)

    expect(result).toBe(555)
  })
})
