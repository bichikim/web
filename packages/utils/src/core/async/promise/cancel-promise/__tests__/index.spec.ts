import flushPromises from 'flush-promises'
import {describe, expect, it} from 'vitest'
import {createCancelPromise} from '../'

describe('cancelPromise', () => {
  it('should cancel promise', async () => {
    let _resolve
    let _data
    let order = 0

    const promise = new Promise((resolve) => {
      _resolve = resolve
    })
    const [cancelPromise, cancel] = createCancelPromise(promise)

    cancelPromise.then((data) => {
      _data = data
    })
    cancel()

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

    const promise = new Promise((resolve) => {
      _resolve = resolve
    })
    const [_, cancel] = createCancelPromise(promise)

    promise.then((data) => {
      _data = data
    })
    _resolve('foo')
    cancel()
    await flushPromises()
    expect(_data).toBe('foo')
  })
})
