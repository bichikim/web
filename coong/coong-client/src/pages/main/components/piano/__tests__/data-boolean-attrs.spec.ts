import {
  booleanAttr,
  booleanTupleAttr,
  dataAttrKey,
  dataBooleanAttrs,
} from '../data-boolean-attrs'

describe('dataAttrKey', () => {
  it('should return data attr key', () => {
    expect(dataAttrKey('foo')).toBe('data-foo')
  })
})

describe('dataBooleanAttrs', () => {
  it('should return BooleanTupleAttr', () => {
    expect(booleanTupleAttr(['foo', true])).toEqual(['data-foo', ''])
  })
})

describe('booleanAttr', () => {
  it('should return BooleanAttr', () => {
    expect(booleanAttr(undefined)).toBe(undefined)
    expect(booleanAttr(null)).toBe(undefined)
    expect(booleanAttr('')).toBe(undefined)
    expect(booleanAttr('t')).toBe('')
    expect(booleanAttr('false')).toBe('')
    expect(booleanAttr('true')).toBe('')
    expect(booleanAttr(true)).toBe('')
    expect(booleanAttr(false)).toBe(undefined)
  })
})

describe('dataBooleanAttrs', () => {
  it('should return data Attrs', () => {
    expect(
      dataBooleanAttrs({
        bar: false,
        foo: true,
      }),
    ).toEqual({
      'data-bar': undefined,
      'data-foo': '',
    })
  })
})
