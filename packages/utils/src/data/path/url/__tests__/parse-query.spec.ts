import {toQueryRecord} from 'src/data/path/url/to-query-record'
import {describe, expect, it} from 'vitest'

describe('parse-query', () => {
  it('should parse query string starting with ?', () => {
    const result = toQueryRecord('?foo=foo1&bar=bar1&john=john1')

    expect(result).toEqual({
      bar: 'bar1',
      foo: 'foo1',
      john: 'john1',
    })
  })

  it('should preserve equals signs after the first separator', () => {
    expect(toQueryRecord('?token=a=b=c')).toEqual({token: 'a=b=c'})
  })

  it('should parse a key without a value as an empty string', () => {
    expect(toQueryRecord('?enabled')).toEqual({enabled: ''})
  })

  it('should return an empty record for an empty query', () => {
    expect(toQueryRecord('')).toEqual({})
    expect(toQueryRecord('?')).toEqual({})
  })
})
