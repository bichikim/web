import {toQueryString} from 'src/path/to-query-string'

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
      {
        sort: (a: string, b: string) => (a > b ? 1 : -1),
      },
    )

    expect(result).toBe('?bar=_bar&foo=_foo&john=_john')
  })
})
