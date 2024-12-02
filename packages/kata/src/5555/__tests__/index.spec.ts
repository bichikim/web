import {createEmitter} from '../'
import {describe, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'

describe('createEmitter', () => {
  it('should call start and end', async () => {
    const emitter = createEmitter()
    const callback1 = vi.fn()

    emitter.on('hello', callback1)

    emitter.emit('hello', 'foo')
    emitter.emit('hello', 'foo')
    emitter.emit('hello', 'foo')
    emitter.emit('hello', 'foo')
    emitter.emit('hello', 'foo')
    emitter.emit('hello', 'foo')

    await flushPromises()

    expect(callback1).toHaveBeenCalledTimes(6)
    expect(callback1).toHaveBeenNthCalledWith(1, 'foo')
  })
})
