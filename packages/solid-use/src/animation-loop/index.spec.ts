/**
 * @vitest-environment jsdom
 */
import {createAnimationLoop} from './'
import {afterEach, beforeEach, describe, expect, it, type Mock, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {createTrigger} from '@winter-love/solid-test'

const setupAnimationLoop = () =>
  createRoot((dispose) => ({
    animationLoop: createAnimationLoop(),
    dispose,
  }))

describe('createAnimationLoop', () => {
  const cancelFlag = 1

  let animationTrigger: ReturnType<typeof createTrigger>
  let requestAnimationFrameMock: Mock<(callback: FrameRequestCallback) => number>
  let cancelAnimationFrameMock: Mock<(handle: number) => void>
  let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn>
  let cancelAnimationFrameSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    animationTrigger = createTrigger()

    requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
      animationTrigger.target = callback

      return cancelFlag
    })
    cancelAnimationFrameMock = vi.fn()

    requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(requestAnimationFrameMock)
    cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(cancelAnimationFrameMock)
  })

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
  })

  it('should call callback on each animation frame and reschedule the loop', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    expect(requestAnimationFrameMock).not.toHaveBeenCalled()
    animationLoop.start(callback)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(callback).not.toHaveBeenCalled()
    expect(animationTrigger.changed).toBe(1)

    const firstTimestamp = 123.45

    animationTrigger.target?.(firstTimestamp)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenNthCalledWith(1, firstTimestamp)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)
    expect(animationTrigger.changed).toBe(2)

    const secondTimestamp = 234.56

    animationTrigger.target?.(secondTimestamp)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(2, secondTimestamp)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(3)

    dispose()
  })

  it('should cancel animation frame with stop', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
    animationLoop.stop()
    expect(cancelAnimationFrameMock).toHaveBeenNthCalledWith(1, cancelFlag)
    expect(callback).not.toHaveBeenCalled()

    dispose()
  })

  it('should not cancel when stop is called without start', () => {
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.stop()
    expect(cancelAnimationFrameMock).not.toHaveBeenCalled()

    dispose()
  })

  it('should cancel only once when stop is called twice', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    animationLoop.stop()
    animationLoop.stop()
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(cancelFlag)

    dispose()
  })

  it('should cancel the pending frame when start is called again', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    animationLoop.start(callback)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(cancelFlag)
    expect(callback).not.toHaveBeenCalled()

    animationLoop.stop()
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(2)

    dispose()
  })

  it('should run the loop again after stop and start', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    animationLoop.stop()
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    cancelAnimationFrameMock.mockClear()
    requestAnimationFrameMock.mockClear()

    animationLoop.start(callback)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)

    animationTrigger.target?.(100)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(100)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)

    dispose()
  })

  it('should cancel the pending next frame when stop is called after a frame runs', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    animationTrigger.target?.(100)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)

    animationLoop.stop()
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(cancelFlag)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)

    dispose()
  })

  it('should cancel animation frame when owning scope is disposed', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
    dispose()
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(cancelFlag)
    expect(callback).not.toHaveBeenCalled()
  })

  it('should not invoke callback from a stale frame after stop', () => {
    const callback = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []

    requestAnimationFrameMock.mockImplementation((frameCallback) => {
      rafCallbacks.push(frameCallback)
      animationTrigger.target = frameCallback

      return rafCallbacks.length
    })

    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    const staleFrame = rafCallbacks[0]

    animationLoop.stop()
    staleFrame(100)

    expect(callback).not.toHaveBeenCalled()

    dispose()
  })

  it('should run only the latest callback after start is called with a new callback', () => {
    const firstCallback = vi.fn()
    const secondCallback = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []

    requestAnimationFrameMock.mockImplementation((frameCallback) => {
      rafCallbacks.push(frameCallback)
      animationTrigger.target = frameCallback

      return rafCallbacks.length
    })

    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(firstCallback)
    const staleFrame = rafCallbacks[0]

    animationLoop.start(secondCallback)
    staleFrame(100)

    expect(firstCallback).not.toHaveBeenCalled()

    animationTrigger.target?.(200)
    expect(secondCallback).toHaveBeenCalledTimes(1)
    expect(secondCallback).toHaveBeenCalledWith(200)

    dispose()
  })

  it('should keep scheduling after callback throws until stop is called', () => {
    const frameError = new Error('frame failed')
    const callback = vi.fn(() => {
      throw frameError
    })
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start(callback)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)

    expect(() => animationTrigger.target?.(100)).toThrow(frameError)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)

    expect(() => animationTrigger.target?.(200)).toThrow(frameError)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(3)

    animationLoop.stop()
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(cancelFlag)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(3)

    dispose()
  })

  it('should no-op start and stop when requestAnimationFrame is unavailable', () => {
    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()

    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)

    try {
      const callback = vi.fn()

      createRoot((dispose) => {
        const animationLoop = createAnimationLoop()

        animationLoop.start(callback)
        animationLoop.stop()
        expect(callback).not.toHaveBeenCalled()

        dispose()
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('should no-op start and stop when cancelAnimationFrame is unavailable', () => {
    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()

    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('cancelAnimationFrame', undefined)

    try {
      const callback = vi.fn()

      createRoot((dispose) => {
        const animationLoop = createAnimationLoop()

        animationLoop.start(callback)
        animationLoop.stop()
        expect(callback).not.toHaveBeenCalled()

        dispose()
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('should not reschedule when stop is called inside the callback', () => {
    const callback = vi.fn()
    const {animationLoop, dispose} = setupAnimationLoop()

    animationLoop.start((timestamp) => {
      callback(timestamp)
      animationLoop.stop()
    })
    animationTrigger.target?.(100)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrameMock).not.toHaveBeenCalled()
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)

    dispose()
  })
})
