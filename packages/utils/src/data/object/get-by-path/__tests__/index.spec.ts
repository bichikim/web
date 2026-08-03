import {describe, expect, it} from 'vitest'
import {getByPath} from '../'

describe('getByPath', () => {
  it('should not get the item with a none object', () => {
    const data = 'foo'

    expect(getByPath(data, ['info', 'name'])).toBeUndefined()
    expect(getByPath(null, ['info'])).toBeUndefined()
  })

  it('should return the item', () => {
    const data = {info: {name: 'foo'}}

    expect(getByPath(data, ['info'])).toEqual({name: 'foo'})
    expect(getByPath(data, [])).toEqual({info: {name: 'foo'}})
    expect(getByPath(data, ['info', 'name'])).toBe('foo')
    expect(getByPath(data, ['message', 'deep'])).toBeUndefined()
    expect(getByPath(data, ['message'])).toBeUndefined()
  })

  it('should stop safely when an intermediate value is null', () => {
    expect(getByPath({info: null}, ['info', 'name'])).toBeNull()
  })

  it('should read symbol keys', () => {
    const key = Symbol('key')

    expect(getByPath({[key]: 'value'}, [key])).toBe('value')
  })
})
