import {defaultValue, defaultValueFn} from '../'

describe('defaultValue', () => {
  it('should return value ', () => {
    expect(defaultValue('foo')).toBe('foo')
    expect(defaultValue(null, () => 'foo')).toBe(null)
    expect(defaultValue(undefined, () => 'foo')).toBe('foo')
    expect(defaultValue(undefined, 'foo')).toBe('foo')
  })
})

describe('defaultValueFn', () => {
  it('should return value ', () => {
    const run = defaultValueFn(() => 'foo')
    expect(run('foo')).toBe('foo')
    expect(run(undefined)).toBe('foo')
    expect(run(undefined)).toBe('foo')
    expect(run(null)).toBe(null)
  })
  it('should return value ', () => {
    const run = defaultValueFn(
      () => 'foo',
      (value) => {
        return value === null || value === undefined
      },
    )
    expect(run('foo')).toBe('foo')
    expect(run(undefined)).toBe('foo')
    expect(run(undefined)).toBe('foo')
    expect(run(null)).toBe('foo')
  })
})
