import {describe, expect, it} from 'vitest'

import {getErrorMessage} from '../get-error-message'

const throwingError = Object.create(null, {
  message: {
    get: () => {
      throw new Error('message getter failed')
    },
  },
})

describe('getErrorMessage', () => {
  it.each([
    [new Error('Network failed'), '기본 오류', 'Network failed'],
    [{message: 'Worker failed'}, '기본 오류', 'Worker failed'],
    [{message: ''}, '기본 오류', '기본 오류'],
    [{message: 123}, '기본 오류', '기본 오류'],
    [null, '기본 오류', '기본 오류'],
    [throwingError, '기본 오류', '기본 오류'],
  ])('should return the message or the fallback', (error, fallback, expected) => {
    expect(getErrorMessage(error, fallback)).toBe(expected)
  })

  it.each([
    [new Error('Network failed'), 'Network failed'],
    [{message: 'Worker failed'}, 'Worker failed'],
    [{message: ''}, null],
    [{message: 123}, null],
    [null, null],
    [throwingError, null],
  ])('should return the message or null without a fallback', (error, expected) => {
    expect(getErrorMessage(error)).toBe(expected)
  })
})
