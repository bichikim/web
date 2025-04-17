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

  it.skip('should reset to 1 when reaching MAX_COUNT', () => {
    const uuid = createUuid(1_000_000)

    expect(uuid()).toBe(1)
  })

  it('should create independent uuid generators', () => {
    const uuid1 = createUuid()
    const uuid2 = createUuid()

    expect(uuid1()).toBe(1)
    expect(uuid1()).toBe(2)
    expect(uuid2()).toBe(1)
    expect(uuid2()).toBe(2)
  })

  it('should never return negative numbers', () => {
    const uuid = createUuid()
    const results = Array.from({length: 100}, () => uuid())

    expect(results.every((number_) => number_ > 0)).toBe(true)
  })
})
