import {describe, expect, it} from 'vitest'

import {getErrorMessage} from '..'

describe('getErrorMessage', () => {
  it.each([
    [new Error('Network failed'), '기본 오류', 'Network failed'],
    [{message: 'Worker failed'}, '기본 오류', 'Worker failed'],
    [{message: ''}, '기본 오류', '기본 오류'],
    [{message: 123}, '기본 오류', '기본 오류'],
    [null, '기본 오류', '기본 오류'],
  ])('should return %s message or the fallback', (error, fallback, expected) => {
    expect(getErrorMessage(error, fallback)).toBe(expected)
  })

  it('should return the fallback when reading message throws', () => {
    const error = Object.create(null, {
      message: {
        get: () => {
          throw new Error('message getter failed')
        },
      },
    })

    expect(getErrorMessage(error, '기본 오류')).toBe('기본 오류')
  })
})
