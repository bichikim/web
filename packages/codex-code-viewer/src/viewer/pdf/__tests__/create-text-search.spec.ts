import {describe, expect, it} from 'vitest'
import {createTextSearch} from '../create-text-search'
const findPdfText = (source: string, query: string) => createTextSearch(source)(query)

describe('findPdfText', () => {
  it('should find literal case-insensitive phrases across line breaks using original offsets', () => {
    expect(findPdfText('Alpha  \n beta [x] ALPHA\tbeta', 'alpha beta')).toEqual([
      {end: 13, start: 0},
      {end: 28, start: 18},
    ])
    expect(findPdfText('Alpha  \n beta [x]', '[x]')).toEqual([{end: 17, start: 14}])
  })
  it('should preserve Unicode offsets and ignore whitespace-only queries', () => {
    expect(findPdfText('한글\n 검색 한글 검색', '한글   검색')).toEqual([
      {end: 6, start: 0},
      {end: 12, start: 7},
    ])
    expect(findPdfText('abc', ' \n ')).toEqual([])
  })
})
