/**
 * @vitest-environment jsdom
 */

import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createRenderGhost} from '../render-ghost'

describe('createRenderGhost', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.body.style.cursor = ''
    Reflect.deleteProperty(HTMLElement.prototype, 'animate')
    vi.restoreAllMocks()
  })

  it('should cancel and remove an active ghost animation when its owner is disposed', () => {
    const animation = new EventTarget() as Animation
    const cancel = vi.fn()
    animation.cancel = cancel
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: vi.fn(() => animation),
    })

    const source = document.createElement('div')
    source.className = 'ghost-source'
    const removed = vi.fn()
    const {dispose, ghost} = createRoot((dispose) => ({
      dispose,
      ghost: createRenderGhost(() => true),
    }))

    ghost.create(source, {x: 5, y: 10})
    ghost.destroy({position: {x: 20, y: 30}}, removed)

    expect(document.body.querySelector('.ghost-source')).not.toBeNull()
    expect(document.body.style.cursor).toBe('grabbing')

    dispose()

    expect(cancel).toHaveBeenCalledOnce()
    expect(document.body.querySelector('.ghost-source')).toBeNull()
    expect(document.body.style.cursor).toBe('auto')
    expect(removed).not.toHaveBeenCalled()
  })
})
