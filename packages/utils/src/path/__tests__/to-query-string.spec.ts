import {encodeQueryKey, toQueryString} from 'src/path/to-query-string'

describe('toQueryString', () => {
  it('should return a query string', () => {
    const result = toQueryString({
      bar: '_bar',
      foo: '_foo',
      john: '_john',
    })

    expect(result).toBe('?bar=_bar&foo=_foo&john=_john')
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
      (a: string, b: string) => (a > b ? 1 : -1),
    )

    expect(result).toBe('?bar=_bar&foo=_foo&john=_john')
  })
})

describe('encodeQueryKey', () => {
  it('should encode a query key', () => {
    const result = encodeQueryKey('foo')

    expect(result).toBe('foo')
  })
  it('should encode a query key with ?', () => {
    const result = encodeQueryKey('?foo')

    expect(result).toBe('foo')
  })
  it('should encode a query key with &', () => {
    const result = encodeQueryKey('&foo')

    expect(result).toBe('foo')
  })
  it('should encode a empty query key', () => {
    const result = encodeQueryKey('')

    expect(result).toBe(undefined)
  })
})
