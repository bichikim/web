import {useDebounce} from '../'
import {expectType} from 'tsd'

jest.mock('debounce', () => ({
  debounce: (func: (...args: any[]) => unknown) => {
    return (...args: any[]) => {
      return func(...args)
    }
  },
}))

describe('useDebounce', () => {
  it('should type', () => {
    const func = useDebounce(() => 'foo')
    expectType<() => string>(func)
    const result = func()
    expect(result).toBe('foo')
  })
})
