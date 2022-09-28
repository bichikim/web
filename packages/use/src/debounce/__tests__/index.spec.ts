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
    const callback = jest.fn(() => 'foo')
    const wait = ref(0)
    const func = scope.run(() => {
      return useDebounce(callback, wait)
    })
    expectType<() => string>(func)
    func()
    expect(callback).toBeCalledTimes(1)
    const clock = useFakeTimers()
    wait.value = 100
    await flushPromises()
    expect(callback).toBeCalledTimes(1)
    func()
    expect(callback).toBeCalledTimes(1)
    clock.tick(100)
    expect(callback).toBeCalledTimes(2)
    clock.restore()
    scope.stop()
  })
  it('should call cancel', async () => {
    const scope = effectScope()
    let call
    const cancel = jest.fn()
    _debounce.mockImplementation(((handle) => {
      call = handle
      return Object.assign(
        () => {
          call()
        },
        {
          cancel,
        },
      )
    }) as any)
    const callback = jest.fn(() => 'foo')
    const wait = ref(100)
    const func = scope.run(() => {
      return useDebounce(callback, wait)
    })
    expectType<() => string>(func)
    func()
    expect(callback).toBeCalledTimes(1)
    scope.stop()
    expect(cancel).toBeCalledTimes(1)
  })
})
