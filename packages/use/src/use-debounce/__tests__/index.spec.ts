import {useDebounce} from '../'
import {expectType} from 'tsd'
import {effectScope, ref} from 'vue'
import {useFakeTimers} from 'sinon'
import {flushPromises} from '@winter-love/vue-test'
import {debounce} from '@winter-love/lodash'

jest.mock('@winter-love/lodash', () => {
  const actual = jest.requireActual('@winter-love/lodash')
  return {
    ...actual,
    debounce: jest.fn(actual.debounce),
  }
})

const _debounce = jest.mocked(debounce)

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
  it('should call immediate with waiting 0 and chaining waiting', async () => {
    const scope = effectScope()
    const clock = useFakeTimers()
    const callback = jest.fn(() => 'foo')
    const wait = ref(0)
    const debounceFunc = scope.run(() => {
      return useDebounce(callback, wait)
    })
    expectType<() => string>(debounceFunc)
    debounceFunc()

    expect(callback).toBeCalledTimes(1)

    wait.value = 100
    await flushPromises()
    expect(callback).toBeCalledTimes(1)
    debounceFunc()
    expect(callback).toBeCalledTimes(1)
    clock.tick(100)
    expect(callback).toBeCalledTimes(2)
    clock.restore()
    scope.stop()
  })
  it('should call cancel', async () => {
    const clock = useFakeTimers()
    const scope = effectScope()
    let call
    const callback = jest.fn(() => 'foo')
    const wait = ref(100)
    const func = scope.run(() => {
      return useDebounce(callback, wait)
    })
    expectType<() => string>(func)

    func()
    clock.tick(100)
    expect(callback).toBeCalledTimes(1)

    func()
    func.cancel()
    clock.tick(100)
    expect(callback).toBeCalledTimes(1)

    func()
    scope.stop()
    clock.tick(100)
    expect(callback).toBeCalledTimes(1)

    clock.restore()
  })
})
