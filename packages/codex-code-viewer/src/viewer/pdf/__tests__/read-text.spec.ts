import {describe, expect, it} from 'vitest'
import {readText} from '../read-text'

describe('readText', () => {
  it('should preserve item offsets and line breaks while skipping metadata', () => {
    expect(
      readText([
        {hasEOL: false, str: 'hello'},
        {type: 'begin'},
        {hasEOL: true, str: ' world'},
        {hasEOL: false, str: '다음 줄'},
      ]),
    ).toEqual({
      offsets: [
        {end: 5, start: 0},
        {end: 11, start: 5},
        {end: 16, start: 12},
      ],
      source: 'hello world\n다음 줄',
    })
  })
  it('should retain empty text item positions and accept an empty page', () => {
    expect(
      readText([
        {hasEOL: true, str: ''},
        {hasEOL: false, str: 'A'},
      ]),
    ).toEqual({
      offsets: [
        {end: 0, start: 0},
        {end: 2, start: 1},
      ],
      source: '\nA',
    })
    expect(readText([])).toEqual({offsets: [], source: ''})
  })
})
