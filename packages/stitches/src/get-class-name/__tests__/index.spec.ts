import {getClassName} from '../'

describe('getClassName', () => {
  it('should return class name', () => {
    const fakeCss = jest.fn(() => ({className: 'foo'}))
    const fakeBinding = {
      value: {
        foo: 'foo',
      },
    }
    expect(getClassName(fakeCss as any, fakeBinding as any)).toBe('foo')
    expect(fakeCss).toHaveBeenCalledWith({foo: 'foo'})
  })
  it('should return class name', () => {
    const fakeCss = jest.fn(() => ({className: 'foo'}))
    const fakeBinding = {
      arg: 'css',
      value: {
        foo: 'foo',
      },
    }
    expect(getClassName(fakeCss as any, fakeBinding as any)).toBe('foo')
    expect(fakeCss).toHaveBeenCalledWith({css: {foo: 'foo'}})
  })
  it('should return class name with undefined value', () => {
    const fakeCss = jest.fn(() => ({className: 'foo'}))
    const fakeBinding = {}
    expect(getClassName(fakeCss as any, fakeBinding as any)).toBe(undefined)
  })
})
