import {describe, expect, it, vi} from 'vitest'
import {createEmitter} from '../'

describe('createEmitter', () => {
  it('call start and end', () => {
    const start = vi.fn()
    const end = vi.fn()
    const emitter = createEmitter({end, start})
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    emitter.addEventListener(callback1)
    expect(start).toHaveBeenCalledTimes(1)
    emitter.addEventListener(callback2)
    emitter.removeEventListener(callback1)
    expect(start).toHaveBeenCalledTimes(1)
    expect(end).toHaveBeenCalledTimes(0)
    emitter.removeEventListener(callback2)
    expect(start).toHaveBeenCalledTimes(1)
    expect(end).toHaveBeenCalledTimes(1)
  })

  it('should call listener', () => {
    const callback = vi.fn()
    const emitter = createEmitter()
    const event = {path: '/foo'}

    emitter.addEventListener(callback)
    emitter.trigger(event)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(event)
    emitter.removeEventListener(callback)
    emitter.trigger(event)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should call async listener', async () => {
    let isWaited = false

    const callback = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            isWaited = true
            resolve(null)
          }, 100)
        }),
    )
    const emitter = createEmitter()
    const event = {path: '/foo'}

    emitter.addEventListener(callback)
    const promise = emitter.trigger(event)

    expect(isWaited).toBe(false)
    await promise
    expect(isWaited).toBe(true)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(event)
    emitter.removeEventListener(callback)
    await emitter.trigger(event)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should call channel listener', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    const emitter = createEmitter()
    const event = {path: '/foo'}

    emitter.addEventListener(callback1)
    emitter.addEventListener(callback2, 'foo')
    emitter.trigger(event)
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
    emitter.trigger(event, {pick: ['foo']})
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(2)
    emitter.trigger(event, {omit: ['foo']})
    expect(callback1).toHaveBeenCalledTimes(2)
    expect(callback2).toHaveBeenCalledTimes(2)
    emitter.trigger(event, {})
    expect(callback1).toHaveBeenCalledTimes(3)
    expect(callback2).toHaveBeenCalledTimes(3)
  })
})
