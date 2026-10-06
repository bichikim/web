import {describe, expect, it} from 'vitest'
import {splitSearchToken} from '../split-search-token'

describe('splitSearchToken', () => {
  it('should preserve original text and result indices when a match crosses token boundaries', () => {
    const token = {
      kind: 'identifier' as const,
      navigation: 'definition' as const,
      offset: 4,
      text: 'world!',
    }
    expect(
      splitSearchToken(token, [
        {end: 3, start: 0},
        {end: 7, start: 2},
        {end: 10, start: 9},
      ]),
    ).toEqual([
      {match: 1, text: 'wor'},
      {match: null, text: 'ld'},
      {match: 2, text: '!'},
    ])
  })
})
