import {jsonParse} from '../'

describe('jsonParse', () => {
  it('should parse Json string', () => {
    const result = jsonParse('{"foo": "foo"}')
    expect(result).toEqual({foo: 'foo'})
  })
  it('should return {} none Json string', () => {
    const result = jsonParse('{"foo": "foo}')
    expect(result).toEqual({})
  })
  it('should return default value none Json string', () => {
    const result = jsonParse('{"foo": "foo}', {bar: 'bar'})
    expect(result).toEqual({bar: 'bar'})
  })
})
