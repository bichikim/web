import {toQueryRecord} from 'src/path/to-query-record'

describe('parse-query', () => {
  it('should parse query string starting with ?', () => {
    const result = toQueryRecord('?foo=foo1&bar=bar1&john=john1')
    expect(result).toEqual({
      bar: 'bar1',
      foo: 'foo1',
      john: 'john1',
    })
  })
})
