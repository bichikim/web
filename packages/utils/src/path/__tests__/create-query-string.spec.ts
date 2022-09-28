import {createQueryString, encodeQueryKey} from '../create-query-string'

describe('resolveQuery', () => {
  it('should return a query string', () => {
    const result = createQueryString({
      bar: '_bar',
      foo: '_foo',
      john: '_john',
    })

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
