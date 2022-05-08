import {useDebounce} from '../'
import {expectType} from 'tsd'
import {effectScope} from 'vue'
import {useFakeTimers} from 'sinon'

describe('useDebounce', () => {
  it('should type', () => {
    const scope = effectScope()
    const clock = useFakeTimers()
    scope.run(() => {
      let result
      const func = useDebounce(() => {
        result = 'foo'
      })
      expectType<() => void>(func)
      func()
      expect(result).toBe(undefined)
      clock.tick(250)
      expect(result).toBe('foo')
    })
    scope.stop()
    clock.restore()
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
