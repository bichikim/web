import {expect} from '@storybook/jest'
import {changeKeys} from '../'
import {camelCase} from '@winter-love/lodash'

describe('change-keys', () => {
  it('should not change keys with a none object', () => {
    expect(changeKeys('foo', camelCase)).toBe('foo')
    expect(changeKeys(20, camelCase)).toBe(20)
    const symbol = Symbol()
    expect(changeKeys(symbol, camelCase)).toBe(symbol)
    expect(changeKeys(null, camelCase)).toBe(null)
    expect(changeKeys(undefined, camelCase)).toBe(undefined)
  })
  it('should change keys with an object', () => {
    expect(
      changeKeys(
        {
          'my-bar': 'bar',
          'my-foo': 'foo',
        },
        camelCase,
      ),
    ).toEqual({myBar: 'bar', myFoo: 'foo'})
  })
  it('should change keys with an array', () => {
    expect(changeKeys([{'my-foo': 'foo'}, {'my-bar': 'bar'}], camelCase)).toEqual([
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
        camelCase,
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
        camelCase,
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
