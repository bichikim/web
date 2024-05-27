import {describe, expect, it} from 'vitest'
import {
  booleanAttr as booleanAttribute,
  booleanTupleAttr as booleanTupleAttribute,
  dataAttrKey as dataAttributeKey,
  dataBooleanAttrs as dataBooleanAttributes,
} from '../data-boolean-attrs'

describe('dataAttrKey', () => {
  it('should return data attr key', () => {
    expect(dataAttributeKey('foo')).toBe('data-foo')
  })
})

describe('dataBooleanAttrs', () => {
  it('should return BooleanTupleAttr', () => {
    expect(booleanTupleAttribute(['foo', true])).toEqual(['data-foo', ''])
  })
})

describe('booleanAttr', () => {
  it('should return BooleanAttr', () => {
    expect(booleanAttribute()).toBe(undefined)
    expect(booleanAttribute(null)).toBe(undefined)
    expect(booleanAttribute('')).toBe(undefined)
    expect(booleanAttribute('t')).toBe('')
    expect(booleanAttribute('false')).toBe('')
    expect(booleanAttribute('true')).toBe('')
    expect(booleanAttribute(true)).toBe('')
    expect(booleanAttribute(false)).toBe(undefined)
  })
})

describe('dataBooleanAttrs', () => {
  it('should return data Attrs', () => {
    expect(
      dataBooleanAttributes({
        bar: false,
        foo: true,
      }),
    ).toEqual({
      'data-bar': undefined,
      'data-foo': '',
    })
  })
})
