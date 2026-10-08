import {describe, expect, expectTypeOf, it} from 'vitest'

import {concatBytes} from '../index'

describe('concatBytes', () => {
  it('should concatenate visible bytes in order including duplicate views', () => {
    const backing = Uint8Array.of(99, 1, 2, 3, 88)
    const first = backing.subarray(1, 3)
    const second = backing.subarray(2, 4)
    const chunks = Object.freeze([first, new Uint8Array(), second, first])

    expect(concatBytes(chunks)).toEqual(Uint8Array.of(1, 2, 2, 3, 1, 2))
    expect(backing).toEqual(Uint8Array.of(99, 1, 2, 3, 88))
  })

  it('should return an owned empty buffer for no chunks or empty chunks', () => {
    const empty = new Uint8Array()
    const result = concatBytes([empty, empty])

    expect(concatBytes([])).toEqual(empty)
    expect(result).toEqual(empty)
    expect(result.buffer).not.toBe(empty.buffer)
  })

  it('should copy a single chunk without sharing its backing buffer', () => {
    const input = Uint8Array.of(1, 2)
    const result = concatBytes([input])

    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(result.buffer).not.toBe(input.buffer)
    input[0] = 9
    result[1] = 8
    expect(input).toEqual(Uint8Array.of(9, 2))
    expect(result).toEqual(Uint8Array.of(1, 8))
    expectTypeOf(result).toEqualTypeOf<Uint8Array<ArrayBuffer>>()
  })

  it('should copy shared-buffer subarrays into an ordinary independent buffer', () => {
    const shared = new Uint8Array(new SharedArrayBuffer(4))
    shared.set([99, 1, 2, 88])
    const result = concatBytes([shared.subarray(1, 3)])

    expect(result).toEqual(Uint8Array.of(1, 2))
    expect(result.buffer).toBeInstanceOf(ArrayBuffer)
    result[0] = 8
    expect(shared).toEqual(Uint8Array.of(99, 1, 2, 88))
    shared[2] = 9
    expect(result).toEqual(Uint8Array.of(8, 2))
  })

  it('should propagate the native error when a source buffer is detached', () => {
    const input = Uint8Array.of(1)
    structuredClone(input.buffer, {transfer: [input.buffer]})

    expect(() => concatBytes([input])).toThrow(expect.objectContaining({name: 'TypeError'}))
  })
})
