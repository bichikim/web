import {toQueryString} from 'src/data/path/url/to-query-string'
import {describe, expect, it} from 'vitest'

describe('toQueryString', () => {
  it('should return a query string', () => {
    const result = toQueryString({
      bar: '_bar',
      foo: '_foo',
      john: '_john',
    })

    expect(result).toBe('?bar=_bar&foo=_foo&john=_john')
  })

  it('should return a query string with custom encoders', () => {
    const result = toQueryString(
      {
        foo: '_foo',
      },
      {
        encodeKey: (key) => `key:${key}`,
        encodeValue: (value) => `value:${value}`,
      },
    )

    expect(result).toBe('?key:foo=value:_foo')
  })

  it('should return a query string with sorting', () => {
    const result = toQueryString(
      {
        john: '_john',
        // eslint-disable-next-line sort-keys-fix/sort-keys-fix
        foo: '_foo',
        // eslint-disable-next-line sort-keys-fix/sort-keys-fix
        bar: '_bar',
      },
      {
        sort: ([aKey], [bKey]) => (aKey > bKey ? 1 : -1),
      },
    )

    expect(result).toBe('?bar=_bar&foo=_foo&john=_john')
  })
})
