import {promiseDebounce} from '../'
import {useFakeTimers} from 'sinon'
import {flushPromises} from '@winter-love/vue-test'

describe('promiseDebounce', () => {
  it('should return promise', async () => {
    const clock = useFakeTimers()
    const newFunction = promiseDebounce(() => 'foo', 250)
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
