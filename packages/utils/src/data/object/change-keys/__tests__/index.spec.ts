import {camelCase} from 'es-toolkit/string'
import {describe, expect, it} from 'vitest'
import {changeKeys} from '../'

describe('change-keys', () => {
  it('should not change keys with a none object', () => {
    expect(changeKeys('foo', camelCase as any)).toBe('foo')
    expect(changeKeys(20, camelCase as any)).toBe(20)
    const symbol = Symbol()

    expect(changeKeys(symbol, camelCase as any)).toBe(symbol)
    expect(changeKeys(null, camelCase as any)).toBe(null)
    expect(changeKeys(undefined, camelCase as any)).toBe(undefined)
  })

  it('should change keys with an object', () => {
    expect(
      changeKeys(
        {
          'my-bar': 'bar',
          'my-foo': 'foo',
        },
        camelCase as any,
      ),
    ).toEqual({myBar: 'bar', myFoo: 'foo'})
  })

  it('should change keys with an array', () => {
    expect(changeKeys([{'my-foo': 'foo'}, {'my-bar': 'bar'}], camelCase as any)).toEqual([
      {myFoo: 'foo'},
      {myBar: 'bar'},
    ])
  })

  it('should change keys with an object so deeply', () => {
    expect(
      changeKeys(
        {
          'my-foo': [
            {'my-foo': 'foo'},
            {
              'my-bar': 'bar',
              'my-john': {
                'my-foo': 'foo',
              },
            },
            'john',
          ],
        },
        camelCase as any,
      ),
    ).toEqual({
      myFoo: [{myFoo: 'foo'}, {myBar: 'bar', myJohn: {myFoo: 'foo'}}, 'john'],
    })
  })

  it('should change keys with deep count', () => {
    expect(
      changeKeys(
        {
          'my-foo': {
            'my-bar': {
              'my-john': 'john',
            },
          },
        },
        camelCase as any,
        2,
      ),
    ).toEqual({
      myFoo: {
        myBar: {
          'my-john': 'john',
        },
      },
    })
  })
})
