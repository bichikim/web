import {describe, expect, it} from 'vitest'
import {findText} from '../find-text'

describe('findText', () => {
  it('should find literal text without interpreting regex punctuation', () => {
    expect(findText('a.b A.B axb', 'a.b')).toEqual([
      {end: 3, start: 0},
      {end: 7, start: 4},
    ])
  })

  it('should preserve UTF-16 source offsets for Unicode and matches across lines', () => {
    expect(findText('😀안녕\n코드 안녕', '안녕\n코드')).toEqual([{end: 7, start: 2}])
  })

  it('should stop collecting at the requested match limit', () => {
    expect(findText('aaaa', 'a', 2)).toEqual([
      {end: 1, start: 0},
      {end: 2, start: 1},
    ])
    expect(findText('aaaa', 'a', 0)).toEqual([])
  })
  it('should return no matches for an empty query or absent text', () => {
    expect(findText('code', '')).toEqual([])
    expect(findText('code', 'missing')).toEqual([])
  })
})
