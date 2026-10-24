import {describe, expect, it} from 'vitest'
import {parseCookieString} from '../parse-cookie-string'

describe('parseCookieString', () => {
  it('should preserve equals signs inside cookie values', () => {
    expect(parseCookieString('token=abc==; redirect=a=b')).toEqual([
      ['token', 'abc=='],
      ['redirect', 'a=b'],
    ])
  })

  it('should support empty values and entries without a separator', () => {
    expect(parseCookieString('empty=; flag')).toEqual([
      ['empty', ''],
      ['flag', ''],
    ])
  })
})
