import {separate} from '../'
import {describe, expect, it} from 'vitest'

describe('separate', () => {
  it('should separate list', () => {
    const [list, left] = separate(['$1', '$2', '$3', '4', '5', '6'], ((item) =>
      item.startsWith('$')) as any)

    expect(list).toEqual(['$1', '$2', '$3'])
    expect(left).toEqual(['4', '5', '6'])
  })
})
