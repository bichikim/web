import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  createPMouthTransitionController,
  getPVisemeTransitionProgress,
  P_MOUTH_TRANSITION_DURATION_MS,
} from '../mouth-transition-controller'

const installAnimationFrames = () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextFrame = 1
  const requestAnimationFrame = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      const frame = nextFrame
      nextFrame += 1
      callbacks.set(frame, callback)
      return frame
    })
  const cancelAnimationFrame = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((frame) => {
      callbacks.delete(frame)
    })
  const getCallback = (frame: number) => {
    const callback = callbacks.get(frame)

    if (callback === undefined) {
      throw new Error(`Expected animation frame ${frame}`)
    }

    return callback
  }
  const run = (frame: number, timestamp: number) => {
    const callback = getCallback(frame)
    callbacks.delete(frame)
    callback(timestamp)
  }

  return {cancelAnimationFrame, getCallback, requestAnimationFrame, run}
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getPVisemeTransitionProgress', () => {
  it('should ease from the current mouth to the next over the co-articulation window', () => {
    expect(getPVisemeTransitionProgress(0)).toBe(0)
    expect(getPVisemeTransitionProgress(P_MOUTH_TRANSITION_DURATION_MS / 2)).toBe(0.5)
    expect(getPVisemeTransitionProgress(P_MOUTH_TRANSITION_DURATION_MS)).toBe(1)
  })

  it('should clamp timestamps outside the transition window', () => {
    expect(getPVisemeTransitionProgress(-1)).toBe(0)
    expect(getPVisemeTransitionProgress(P_MOUTH_TRANSITION_DURATION_MS + 1)).toBe(1)
  })
})

describe('createPMouthTransitionController', () => {
  it('should render and settle a complete transition', () => {
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000)
    const animationFrames = installAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(onTransitionChange)

    expect(controller.current).toBeNull()

    controller.start('rest', 'round', false)

    expect(controller.current).toEqual({from: 'rest', progress: 0, to: 'round'})
    expect(onTransitionChange).toHaveBeenCalledOnce()

    animationFrames.run(1, 1_050)

    expect(controller.current).toEqual({from: 'rest', progress: 0.5, to: 'round'})
    expect(animationFrames.requestAnimationFrame).toHaveBeenCalledTimes(2)

    animationFrames.run(2, 1_100)

    expect(controller.current).toBeNull()
    expect(onTransitionChange).toHaveBeenCalledTimes(4)

    controller.cancel()
    expect(animationFrames.cancelAnimationFrame).not.toHaveBeenCalled()
  })

  it('should notify immediately for reduced motion and an unchanged viseme', () => {
    const animationFrames = installAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(onTransitionChange)

    controller.start('rest', 'round', true)
    controller.start('wide', 'wide', false)

    expect(controller.current).toBeNull()
    expect(onTransitionChange).toHaveBeenCalledTimes(2)
    expect(animationFrames.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('should replace unrelated transitions and settle a zero-progress reversal immediately', () => {
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000)
    const animationFrames = installAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(onTransitionChange)

    controller.start('rest', 'round', false)
    controller.start('closed', 'open', false)
    controller.start('rest', 'closed', false)
    controller.start('closed', 'rest', false)

    expect(controller.current).toBeNull()
    expect(onTransitionChange).toHaveBeenCalledTimes(4)
    expect(animationFrames.requestAnimationFrame).toHaveBeenCalledTimes(3)
    expect(animationFrames.cancelAnimationFrame).toHaveBeenNthCalledWith(1, 1)
    expect(animationFrames.cancelAnimationFrame).toHaveBeenNthCalledWith(2, 2)
    expect(animationFrames.cancelAnimationFrame).toHaveBeenNthCalledWith(3, 3)
  })

  it('should reverse from the current transition progress', () => {
    let now = 1_000
    vi.spyOn(window.performance, 'now').mockImplementation(() => now)
    const animationFrames = installAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(onTransitionChange)

    controller.start('narrow', 'wide', false)
    animationFrames.run(1, 1_050)

    now = 1_050
    controller.start('wide', 'narrow', false)

    expect(controller.current).toEqual({from: 'narrow', progress: 0.5, to: 'wide'})
    expect(animationFrames.cancelAnimationFrame).toHaveBeenCalledWith(2)

    animationFrames.run(3, 1_075)
    expect(controller.current).toEqual({from: 'narrow', progress: 0.25, to: 'wide'})

    animationFrames.run(4, 1_100)
    expect(controller.current).toBeNull()
  })

  it('should cancel an active frame and ignore a late frame after destruction', () => {
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000)
    const animationFrames = installAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(onTransitionChange)

    controller.start('rest', 'round', false)
    const lateFrame = animationFrames.getCallback(1)
    controller.destroy()

    expect(controller.current).toBeNull()
    expect(animationFrames.cancelAnimationFrame).toHaveBeenCalledWith(1)

    lateFrame(1_050)
    expect(onTransitionChange).toHaveBeenCalledOnce()
  })
})
