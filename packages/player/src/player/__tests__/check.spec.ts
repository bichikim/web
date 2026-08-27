import {describe, expect, it} from 'vitest'
import {isDtsSupported} from '../check'

describe('isDtsSupported', () => {
  it('should report DTS support', () => {
    expect(isDtsSupported()).toBe(true)
  })
})
