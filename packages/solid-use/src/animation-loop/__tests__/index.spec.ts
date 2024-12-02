/**
 * @vitest-environment jsdom
 */
import {useAnimationLoop} from '../'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {createTrigger} from '@winter-love/solid-test'

describe('useAnimationLoop', () => {
  const animationTrigger = createTrigger()
  const requestAnimationFrame: any = vi.fn((callback) => {
    animationTrigger.target = callback
  })
  const cancelAnimationFrame = vi.fn()
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(requestAnimationFrame)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(cancelAnimationFrame)
  })
  afterEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockRestore()
    vi.spyOn(window, 'cancelAnimationFrame').mockRestore()
  })
  it('should call callback many in animation frame', () => {
    const callback = vi.fn()
    const {dispose, animationLoop} = createRoot((dispose) => {
      const animationLoop = useAnimationLoop(callback)
      return {animationLoop, dispose}
    })

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    animationLoop.start()
    expect(requestAnimationFrame).toHaveBeenCalled()
    expect(callback).not.toHaveBeenCalled()
    expect(animationTrigger.changed).toBe(1)

    animationTrigger.run()

    expect(callback).toHaveBeenCalledTimes(1)
    expect(animationTrigger.changed).toBe(2)
  })
})
