/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi, beforeEach} from 'vitest'
import {renderHook} from '@solidjs/testing-library'
import {useCountdown} from '../'

const mocks = vi.hoisted(() => {
  return {
    useAnimationFrame: vi.fn(),
  }
})

vi.mock('src/use/animation-frame', () => {
  return {
    useAnimationFrame: mocks.useAnimationFrame,
  }
})

describe('useCountdown', () => {
  beforeEach(() => {
    mocks.useAnimationFrame.mockReset()
  })

  it('should pass options to useAnimationFrame and update count until reaching 0', () => {
    let now = 0
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    let tick: (() => void) | undefined

    const interval = {
      isRunning: vi.fn(() => false),
      start: vi.fn(),
      stop: vi.fn(),
    }

    mocks.useAnimationFrame.mockImplementation((callback: () => void) => {
      tick = callback

      return interval
    })

    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useCountdown(1000, callback, {fps: 30}))

    expect(mocks.useAnimationFrame).toHaveBeenCalledTimes(1)
    expect(mocks.useAnimationFrame.mock.calls[0]?.[1]).toEqual({fps: 30})
    now = 0
    result.start()
    expect(interval.start).toHaveBeenCalledTimes(1)
    expect(tick !== undefined).toBe(true)
    now = 500
    tick?.()
    expect(result.count()).toBe(500)
    expect(callback).toHaveBeenCalledTimes(0)
    now = 1200
    tick?.()
    expect(result.count()).toBe(0)
    expect(callback).toHaveBeenCalledTimes(1)
    result.isRunning()
    result.stop()
    expect(interval.stop).toHaveBeenCalledTimes(1)
    cleanup()
    dateNowSpy.mockRestore()
  })
})
