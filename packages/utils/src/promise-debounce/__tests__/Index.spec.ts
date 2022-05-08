import {promiseDebounce} from '../'
import {useFakeTimers} from 'sinon'

describe('promiseDebounce', () => {
  it.skip('should return promise', () => {
    const clock = useFakeTimers()
    const newFunction = promiseDebounce(() => 'foo', 250)
    const foo = newFunction()
    // noinspection SuspiciousTypeOfGuard
    expect(foo instanceof Promise).toBe(true)
    let result
    foo.then((data) => {
      console.log(data, '1')
      result = data
    })
    console.log('2')
    expect(result).toBe(undefined)
    clock.tick(250)
    console.log('3')
    expect(result).toBe('foo')
    clock.restore()
  })
})
