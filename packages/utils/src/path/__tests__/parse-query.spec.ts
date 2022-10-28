import {parseQuery} from '../parse-query'

describe('parse-query', () => {
  it('should parse query string starting with ?', () => {
    const result = parseQuery('?foo=foo1&bar=bar1&john=john1')
    expect(result).toEqual({
      bar: 'bar1',
      foo: 'foo1',
      john: 'john1',
    })
  })
})
