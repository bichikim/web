import {describe, expect, it} from 'vitest'
import {excludeByIds} from '..'

describe('excludeByIds', () => {
  it('should retain identities, order, and duplicates outside the excluded ids', () => {
    const first = {id: 'a'}
    const second = {id: 'b'}
    const values = [first, second, first]
    expect(excludeByIds(values, ['b', 'b'])).toEqual([first, first])
    expect(excludeByIds(values, [])[0]).toBe(first)
    expect(values).toEqual([first, second, first])
    expect(excludeByIds([], ['a'])).toEqual([])
  })
})
