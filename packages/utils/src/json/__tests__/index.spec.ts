import {CIRCULAR, jsonParse, jsonStringify} from '../'

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

describe('jsonStringify', () => {
  it('should return string', async () => {
    const result = jsonStringify({
      foo: 'foo',
    })
    expect(result).toBe('{"foo":"foo"}')
  })

  it('should return string', async () => {
    const _object = {props: {} as any}
    _object.props = _object
    const result = jsonStringify(_object)
    expect(result).toBe(`{"props":"${CIRCULAR}"}`)
  })
})
