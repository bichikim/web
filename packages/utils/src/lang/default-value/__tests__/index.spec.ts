import {isNil} from 'src/validate/is-nil'
import {isUndefined} from 'src/validate/is-undefined'
import {defaultValue, defaultValueOp} from '../'

describe('defaultValue', () => {
  it('should return value ', () => {
    expect(defaultValue('foo', undefined)).toBe('foo')
    expect(defaultValue(undefined, undefined)).toBeUndefined()
    expect(defaultValue(null, () => 'foo')).toBe(null)
    expect(defaultValue(undefined, 'foo')).toBe('foo')
    expect(defaultValue(undefined, () => 'foo')).toBe('foo')
    expect(defaultValue(undefined, 'foo', (value) => value === null)).toBeUndefined()
  })
})

describe('defaultValueOp', () => {
  it('should return value', () => {
    expect(defaultValueOp(undefined, undefined, 'foo')).toBe('foo')
    expect(
      defaultValueOp(undefined, undefined, undefined as undefined | string),
    ).toBeUndefined()
    expect(defaultValueOp(() => 'foo', undefined, undefined)).toBe('foo')
    expect(defaultValueOp('foo', undefined, undefined)).toBe('foo')
    expect(defaultValueOp(() => 'foo', isNil, null)).toBe('foo')
  })
  it('should return value (curry)', () => {
    expect(defaultValueOp()('foo')).toBe('foo')
    expect(defaultValueOp()(undefined as undefined | string)).toBeUndefined()
    expect(defaultValueOp(() => 'foo')(undefined)).toBe('foo')
    expect(defaultValueOp('foo')(undefined)).toBe('foo')
    expect(defaultValueOp(() => 'foo', isUndefined)(undefined)).toBe('foo')
  })
})
