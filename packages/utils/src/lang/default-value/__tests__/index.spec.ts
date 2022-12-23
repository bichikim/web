import {defaultValue, defaultValueOp} from '../'
import {isUndefined} from 'src/is/is-undefined'
import {isNil} from 'src/is/is-nil'

describe('defaultValue', () => {
  it('should return value ', () => {
    expect(defaultValue('foo')).toBe('foo')
    expect(defaultValue(undefined as undefined | string)).toBeUndefined()
    expect(defaultValue(null as null | string, () => 'foo')).toBe(null)
    expect(defaultValue(undefined as undefined | string, 'foo')).toBe('foo')
    expect(defaultValue(undefined as undefined | string, () => 'foo')).toBe('foo')
    expect(
      defaultValue(undefined as undefined | string, 'foo', (value) => value === null),
    ).toBeUndefined()
  })
})

describe('defaultValueOp', () => {
  it('should return value', () => {
    expect(defaultValueOp(undefined, undefined, 'foo')).toBe('foo')
    expect(defaultValueOp(undefined, undefined, undefined as undefined | string)).toBeUndefined()
    expect(defaultValueOp(() => 'foo', undefined, undefined as null | string)).toBe('foo')
    expect(defaultValueOp('foo', undefined, undefined as null | string)).toBe('foo')
    expect(defaultValueOp(() => 'foo', isNil, null)).toBe('foo')
  })
  it('should return value (curry)', () => {
    expect(defaultValueOp()('foo')).toBe('foo')
    expect(defaultValueOp()(undefined as undefined | string)).toBeUndefined()
    expect(defaultValueOp(() => 'foo')(undefined as null | string)).toBe('foo')
    expect(defaultValueOp('foo')(undefined as null | string)).toBe('foo')
    expect(defaultValueOp(() => 'foo', isUndefined)(undefined as null | string)).toBe('foo')
  })
})
