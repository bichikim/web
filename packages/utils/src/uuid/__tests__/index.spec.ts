import {createUuid} from '../'
import {describe, expect, it} from 'vitest'

describe('uuid', () => {
  it('should create uuid factory', () => {
    const uuid = createUuid()

    expect(uuid).toBeInstanceOf(Function)
    expect(uuid()).toBe(1)
    expect(uuid()).toBe(2)
    expect(uuid()).toBe(3)
  })
})
