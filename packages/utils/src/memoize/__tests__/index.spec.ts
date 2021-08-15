import {deepMemoize, memoize} from '../'

describe('memoize', () => {
  it('should memo the result from comparing arguments', () => {
    const logic = jest.fn((foo: string) => `${foo}+`)
    const memoLogic = memoize()(logic)

    expect(memoLogic('foo')).toBe('foo+')
    expect(logic).toBeCalledTimes(1)
    expect(memoLogic('foo')).toBe('foo+')
    expect(logic).toBeCalledTimes(1)
    expect(memoLogic('bar')).toBe('bar+')
    expect(logic).toBeCalledTimes(2)
  })
})

describe('deep memoize', () => {
  it('should memo the result from comparing arguments deeply', () => {
    const logic = jest.fn((context: {foo: string}) => `${context.foo}+`)
    const memoLogic = deepMemoize()(logic)
    expect(memoLogic({foo: 'foo'})).toBe('foo+')
    expect(logic).toBeCalledTimes(1)
    expect(memoLogic({foo: 'foo'})).toBe('foo+')
    expect(logic).toBeCalledTimes(1)
    expect(memoLogic({foo: 'bar'})).toBe('bar+')
    expect(logic).toBeCalledTimes(2)
  })
})
