/**
 * @vitest-environment jsdom
 */
import {useAnimationLoop} from '../'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {createTrigger} from '@winter-love/solid-test'

describe('useAnimationLoop', () => {
  const animationTrigger = createTrigger()
  const cancelFlag = 1

  const requestAnimationFrame: any = vi.fn((callback) => {
    animationTrigger.target = callback

    return cancelFlag
  })
  const cancelAnimationFrame = vi.fn()

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(requestAnimationFrame)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(cancelAnimationFrame)
  })

  afterEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockRestore()
    vi.spyOn(window, 'cancelAnimationFrame').mockRestore()
    requestAnimationFrame.mockClear()
    cancelAnimationFrame.mockClear()
  })

  it('should call callback many in animation frame', () => {
    const callback = vi.fn()
    const {animationLoop} = createRoot((dispose) => {
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

  it('should cancel animation frame with dispose', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = createRoot((dispose) => {
      const animationLoop = useAnimationLoop(callback)

      return {animationLoop, dispose}
    })

    animationLoop.start()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    dispose()
    expect(cancelAnimationFrame).toHaveBeenNthCalledWith(1, cancelFlag)
    expect(callback).not.toHaveBeenCalled()
  })

  it('should cancel animation frame with stop', () => {
    const callback = vi.fn()
    const {animationLoop} = createRoot((dispose) => {
      const animationLoop = useAnimationLoop(callback)

      return {animationLoop, dispose}
    })

    animationLoop.start()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    animationLoop.stop()
    expect(cancelAnimationFrame).toHaveBeenNthCalledWith(1, cancelFlag)
    expect(callback).not.toHaveBeenCalled()
  })
})
