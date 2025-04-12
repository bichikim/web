import {callbackify} from '../'
import {describe, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'

describe('callbackify', () => {
  it('should call a callback function', async () => {
    const callback = vi.fn()

    callbackify(() => Promise.resolve('foo'), callback)
    expect(callback).not.toHaveBeenCalled()
    await flushPromises()
    expect(callback).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith(undefined, 'foo')
  })

  it('should call a callback function with an error', async () => {
    const callback = vi.fn()

    callbackify(() => Promise.reject(new Error('foo')), callback)
    expect(callback).not.toHaveBeenCalled()
    await flushPromises()
    expect(callback).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith(new Error('foo'))
  })

  it('should call a callback with none promise', () => {
    const callback = vi.fn()

    callbackify(() => 'foo', callback)
    expect(callback).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith(undefined, 'foo')
  })

  it('should call a callback with none promise', () => {
    const callback = vi.fn()

    callbackify(() => {
      throw new Error('foo')
    }, callback)
    expect(callback).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith(new Error('foo'))
  })
})
