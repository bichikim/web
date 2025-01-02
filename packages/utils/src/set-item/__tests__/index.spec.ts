import {describe, expect, it} from 'vitest'
import {setItem} from '../'

describe('setItem', () => {
  it('should update the item', () => {
    const data = {info: {name: 'foo'}}

    setItem(data, ['info', 'name'], 'bar')
    expect(data).toEqual({info: {name: 'bar'}})
    setItem(data, ['info', 'age'], 10)
    expect(data).toEqual({info: {age: 10, name: 'bar'}})
    setItem(data, ['message'], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
    setItem(data, [], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
    setItem(data, ['some', 'where', 'far', 'a go'], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
    setItem(data, ['info', 'age', 'foo'], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
  })
})
