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

  it('should clear every registered event listener', () => {
    const emitter = createEmitter((name: 'down' | 'up') => `instrument:${name}`, ['down', 'up'])
    const listener = vi.fn()

    emitter.addEventListener('down', listener)
    emitter.clear()
    emitter.emit('down', 60)

    expect(listener).not.toHaveBeenCalled()
  })
})
