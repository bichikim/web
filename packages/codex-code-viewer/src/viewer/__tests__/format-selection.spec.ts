import {describe, expect, it} from 'vitest'
import {formatSelection} from '../format-selection'

describe('formatSelection', () => {
  it.each([
    {column: 1, endColumn: 1, expected: 'helper.ts:1:1'},
    {column: 7, endColumn: 7, expected: 'helper.ts:1:7'},
    {column: 1, endColumn: 7, expected: 'helper.ts:1:1-1:7'},
    {column: 1, endColumn: undefined, expected: 'helper.ts:1:1'},
  ])('should format a single-line selection as $expected', ({column, endColumn, expected}) => {
    expect(formatSelection({column, endColumn, endLine: 1, line: 1, path: 'helper.ts'})).toBe(
      expected,
    )
  })

  it('should retain a multiline range with matching start and end columns', () => {
    expect(formatSelection({column: 1, endColumn: 1, endLine: 2, line: 1, path: 'helper.ts'})).toBe(
      'helper.ts:1:1-2:1',
    )
  })
})
