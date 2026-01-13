/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@solidjs/testing-library'
import {useAnimationFrame} from '../'

describe('useAnimationFrame', () => {
  let rafCallbacks: Array<(timestamp: number) => void> = []
  let rafId = 0

  beforeEach(() => {
    rafCallbacks = []
    rafId = 0

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        rafId += 1
        rafCallbacks.push(callback)

        return rafId
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const flushRaf = (timestamp: number) => {
    const callbacks = [...rafCallbacks]

    rafCallbacks = []

    for (const callback of callbacks) {
      callback(timestamp)
    }
  }

  it('should not start animation loop by default', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback))

    expect(result.isRunning()).toBe(false)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    cleanup()
  })

  it('should start animation loop when start() is called', async () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback))

    result.start()

    await waitFor(() => {
      expect(result.isRunning()).toBe(true)
      expect(requestAnimationFrame).toHaveBeenCalled()
    })
    cleanup()
  })

  it('should stop animation loop when stop() is called', async () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback))

    result.start()

    await waitFor(() => {
      expect(result.isRunning()).toBe(true)
    })
    result.stop()

    await waitFor(() => {
      expect(result.isRunning()).toBe(false)
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })
    cleanup()
  })

  it('should call callback with deltaTime on each frame', async () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback))

    result.start()

    await waitFor(() => {
      expect(requestAnimationFrame).toHaveBeenCalled()
    })
    // First frame at timestamp 0
    flushRaf(0)
    // deltaTime is 0 on first frame (0 - 0)
    expect(callback).toHaveBeenCalledWith(0)
    // Second frame at timestamp 16
    flushRaf(16)
    expect(callback).toHaveBeenCalledWith(16)
    cleanup()
  })

  it('should limit FPS when fps option is provided', async () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback, {fps: 30}))

    result.start()

    await waitFor(() => {
      expect(requestAnimationFrame).toHaveBeenCalled()
    })
    // First frame at timestamp 0 - deltaTime is 0, which is < 33.33ms, so skipped
    flushRaf(0)
    expect(callback).toHaveBeenCalledTimes(0)
    // Frame at 10ms - deltaTime is 10ms, still < 33.33ms, skipped
    flushRaf(10)
    expect(callback).toHaveBeenCalledTimes(0)
    // Frame at 34ms - deltaTime is 34ms, >= 33.33ms, should be called
    flushRaf(34)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(34)
    // Frame at 50ms - deltaTime is 16ms (50 - 34), < 33.33ms, skipped
    flushRaf(50)
    expect(callback).toHaveBeenCalledTimes(1)
    // Frame at 70ms - deltaTime is 36ms (70 - 34), >= 33.33ms, should be called
    flushRaf(70)
    expect(callback).toHaveBeenCalledTimes(2)
    cleanup()
  })

  it('should cancel animation frame on cleanup', async () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback))

    result.start()

    await waitFor(() => {
      expect(result.isRunning()).toBe(true)
    })
    cleanup()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('should reset lastTime when stopped and restarted', async () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useAnimationFrame(callback))

    result.start()

    await waitFor(() => {
      expect(requestAnimationFrame).toHaveBeenCalled()
    })
    flushRaf(100)
    // First frame, deltaTime = 0
    expect(callback).toHaveBeenCalledWith(0)
    result.stop()

    await waitFor(() => {
      expect(result.isRunning()).toBe(false)
    })
    result.start()

    await waitFor(() => {
      expect(result.isRunning()).toBe(true)
    })
    // After restart, first frame should have deltaTime = 0 again
    flushRaf(200)
    expect(callback).toHaveBeenLastCalledWith(0)
    cleanup()
  })
})
