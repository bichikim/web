import {describe, expect, it} from 'vitest'
import {getItem} from '../'

describe('getItem', () => {
  it('should not get the item with a none object', () => {
    const data = 'foo'

    expect(getItem(data, ['info', 'name'])).toBeUndefined()
  })

  it('should return the item', () => {
    const data = {info: {name: 'foo'}}

    expect(getItem(data, ['info'])).toEqual({name: 'foo'})
    expect(getItem(data, [])).toEqual({info: {name: 'foo'}})
    expect(getItem(data, ['info', 'name'])).toBe('foo')
    expect(getItem(data, ['message', 'deep'])).toBeUndefined()
    expect(getItem(data, ['message'])).toBeUndefined()
  })
})
