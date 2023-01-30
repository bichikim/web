import {flushPromises} from '@winter-love/vue-test'
import {useFakeTimers} from 'sinon'
import {debouncePromise} from '../'

describe('debouncePromise', () => {
  it('should return promise', async () => {
    const clock = useFakeTimers()
    const newFunction = debouncePromise(() => 'foo', 250)
    const foo = newFunction()
    // noinspection SuspiciousTypeOfGuard
    expect(foo instanceof Promise).toBe(true)
    let result
    foo.then((data) => {
      result = data
    })
    expect(result).toBe(undefined)
    clock.tick(250)
    await flushPromises()
    expect(result).toBe('foo')
    clock.restore()
  })
})
