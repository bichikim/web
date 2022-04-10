import {useDebounce} from '../'
import {expectType} from 'tsd'
import {effectScope} from 'vue'

jest.mock('debounce', () => ({
  debounce: jest.fn((func: (...args: any[]) => unknown) => {
    return (...args: any[]) => {
      return func(...args)
    }
  }),
}))

describe('useDebounce', () => {
  it('should type', () => {
    const scope = effectScope()
    scope.run(() => {
      const func = useDebounce(() => 'foo')
      expectType<() => string>(func)
      const result = func()
      expect(result).toBe('foo')
    })
    scope.stop()
  })
  it('should call immediate with waiting 0', () => {
    const scope = effectScope()
    scope.run(() => {
      const func = useDebounce(() => 'foo', 0)
      expectType<() => string>(func)
      const result = func()
      expect(result).toBe('foo')
    })
    scope.stop()
  })
})
