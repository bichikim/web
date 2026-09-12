import {describe, expect, it} from 'vitest'

import {isObject} from '..'

describe('isObject', () => {
  it.each([
    [{}, true],
    [new Error('failed'), true],
    [[], false],
    [null, false],
    ['message', false],
    [42, false],
  ])('should return %s for %s', (value, expected) => {
    expect(isObject(value)).toBe(expected)
  })
})
