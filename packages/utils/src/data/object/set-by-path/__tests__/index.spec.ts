import {describe, expect, it} from 'vitest'
import {setByPath} from '../'

describe('setByPath', () => {
  it('should update the item', () => {
    const data = {info: {name: 'foo'}}

    setByPath(data, ['info', 'name'], 'bar')
    expect(data).toEqual({info: {name: 'bar'}})
    setByPath(data, ['info', 'age'], 10)
    expect(data).toEqual({info: {age: 10, name: 'bar'}})
    setByPath(data, ['message'], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
    setByPath(data, [], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
    setByPath(data, ['some', 'where', 'far', 'a go'], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
    setByPath(data, ['info', 'age', 'foo'], 'hello')
    expect(data).toEqual({info: {age: 10, name: 'bar'}, message: 'hello'})
  })

  it('should reject paths that can mutate object prototypes', () => {
    const data = {}

    setByPath(data, ['__proto__', 'polluted'], true)

    expect(Reflect.get(Object.prototype, 'polluted')).toBeUndefined()
  })

  it('should set empty and symbol keys', () => {
    const key = Symbol('key')
    const data: Record<PropertyKey, unknown> = {}

    setByPath(data, [''], 'empty')
    setByPath(data, [key], 'symbol')

    expect(data).toEqual({'': 'empty', [key]: 'symbol'})
  })
})
