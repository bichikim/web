/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {createEmitter} from '../emitter'

describe('createEmitter', () => {
  it('should deliver named events once per listener and remove them', () => {
    const emitter = createEmitter((name: 'note') => `instrument:${name}`, ['note'])
    const listener = vi.fn()

    emitter.addEventListener('note', listener)
    emitter.addEventListener('note', listener)
    emitter.emit('note', {midi: 60})
    emitter.removeEventListener('note', listener)
    emitter.emit('note', {midi: 61})

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({midi: 60})
  })

  it('should register the same listener once after clear and remove it normally', () => {
    const emitter = createEmitter((name: 'note') => `instrument:${name}`, ['note'])
    const listener = vi.fn()

    emitter.addEventListener('note', listener)
    emitter.clear()
    emitter.addEventListener('note', listener)
    emitter.addEventListener('note', listener)
    emitter.emit('note', {midi: 60})
    emitter.removeEventListener('note', listener)
    emitter.emit('note', {midi: 61})
    emitter.clear()

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({midi: 60})
  })

  it('should keep cleared listeners detached when another listener is registered', () => {
    const emitter = createEmitter((name: 'note') => `instrument:${name}`, ['note'])
    const previous = vi.fn()
    const current = vi.fn()

    emitter.addEventListener('note', previous)
    emitter.clear()
    emitter.clear()
    emitter.emit('note', {midi: 60})
    emitter.addEventListener('note', current)
    emitter.emit('note', {midi: 61})
    emitter.clear()

    expect(previous).not.toHaveBeenCalled()
    expect(current).toHaveBeenCalledOnce()
    expect(current).toHaveBeenCalledWith({midi: 61})
  })

  it('should clear every registered event listener', () => {
    const emitter = createEmitter((name: 'down' | 'up') => `instrument:${name}`, ['down', 'up'])
    const listener = vi.fn()

    const onUp = vi.fn()

    emitter.addEventListener('down', listener)
    emitter.addEventListener('up', onUp)
    emitter.clear()
    emitter.emit('down', 60)
    emitter.emit('up', 60)

    expect(listener).not.toHaveBeenCalled()
    expect(onUp).not.toHaveBeenCalled()
  })
})
