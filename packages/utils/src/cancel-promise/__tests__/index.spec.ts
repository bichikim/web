import {createCancelPromise} from '../'
import {flushPromises} from '@winter-love/vue-test'

describe('cancelPromise', () => {
  it('should cancel promise', async () => {
    let _resolve
    let _data
    let order = 0

    const cancelPromise = createCancelPromise((resolve) => {
      _resolve = resolve
    })
    cancelPromise.then((data) => {
      _data = data
    })
    cancelPromise.cancel()
    process.nextTick(() => {
      order += 1
      expect(order).toBe(2)
      _resolve('foo')
    })
    order += 1
    expect(order).toBe(1)
    await flushPromises()
    order += 1
    expect(order).toBe(3)
    await flushPromises()
    expect(_data).not.toBe('foo')
  })
  it('should cancel promise (before cancel)', async () => {
    let _resolve
    let _data
    const promise = createCancelPromise((resolve) => {
      _resolve = resolve
    })

    promise.then((data) => {
      _data = data
    })
    _resolve('foo')
    promise.cancel()
    await flushPromises()
    expect(_data).toBe('foo')
  })
})
