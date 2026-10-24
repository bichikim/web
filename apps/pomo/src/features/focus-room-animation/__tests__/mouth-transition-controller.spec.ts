/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {
  createPMouthTransitionController,
  getPVisemeTransitionProgress,
  P_MOUTH_TRANSITION_DURATION_MS,
} from '../mouth-transition-controller'

const createAnimationFrames = () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextFrame = 1
  const requestAnimationFrame = vi.fn((callback: (timestamp: number) => void) => {
    const frame = nextFrame
    nextFrame += 1
    callbacks.set(frame, callback)
    return frame
  })
  const cancelAnimationFrame = vi.fn((frame: number) => {
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

  return {getCallback, run, scheduler: {cancelAnimationFrame, requestAnimationFrame}}
}

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
  it('should keep frame cancellation and clocks local to each scheduler', () => {
    const firstFrames = createAnimationFrames()
    const secondFrames = createAnimationFrames()
    const first = createPMouthTransitionController(vi.fn(), firstFrames.scheduler)
    const second = createPMouthTransitionController(vi.fn(), secondFrames.scheduler)

    first.start('rest', 'round', false)
    second.start('closed', 'open', false)
    first.destroy()

    expect(firstFrames.scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(secondFrames.scheduler.cancelAnimationFrame).not.toHaveBeenCalled()

    secondFrames.run(1, 2_000)
    secondFrames.run(2, 2_050)
    expect(first.current).toBeNull()
    expect(second.current).toEqual({from: 'closed', progress: 0.5, to: 'open'})

    second.destroy()
    expect(secondFrames.scheduler.cancelAnimationFrame).toHaveBeenCalledWith(3)
  })

  it('should render and settle a complete transition', () => {
    const animationFrames = createAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(
      onTransitionChange,
      animationFrames.scheduler,
    )

    expect(controller.current).toBeNull()

    controller.start('rest', 'round', false)

    expect(controller.current).toEqual({from: 'rest', progress: 0, to: 'round'})
    expect(onTransitionChange).toHaveBeenCalledOnce()

    animationFrames.run(1, 1_000)
    animationFrames.run(2, 1_050)

    expect(controller.current).toEqual({from: 'rest', progress: 0.5, to: 'round'})
    expect(animationFrames.scheduler.requestAnimationFrame).toHaveBeenCalledTimes(3)

    animationFrames.run(3, 1_100)

    expect(controller.current).toBeNull()
    expect(onTransitionChange).toHaveBeenCalledTimes(5)

    controller.cancel()
    expect(animationFrames.scheduler.cancelAnimationFrame).not.toHaveBeenCalled()
  })

  it('should notify immediately for reduced motion and an unchanged viseme', () => {
    const animationFrames = createAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(
      onTransitionChange,
      animationFrames.scheduler,
    )

    controller.start('rest', 'round', true)
    controller.start('wide', 'wide', false)

    expect(controller.current).toBeNull()
    expect(onTransitionChange).toHaveBeenCalledTimes(2)
    expect(animationFrames.scheduler.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('should replace unrelated transitions and settle a zero-progress reversal immediately', () => {
    const animationFrames = createAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(
      onTransitionChange,
      animationFrames.scheduler,
    )

    controller.start('rest', 'round', false)
    controller.start('closed', 'open', false)
    controller.start('rest', 'closed', false)
    controller.start('closed', 'rest', false)

    expect(controller.current).toBeNull()
    expect(onTransitionChange).toHaveBeenCalledTimes(4)
    expect(animationFrames.scheduler.requestAnimationFrame).toHaveBeenCalledTimes(3)
    expect(animationFrames.scheduler.cancelAnimationFrame).toHaveBeenNthCalledWith(1, 1)
    expect(animationFrames.scheduler.cancelAnimationFrame).toHaveBeenNthCalledWith(2, 2)
    expect(animationFrames.scheduler.cancelAnimationFrame).toHaveBeenNthCalledWith(3, 3)
  })

  it('should reverse from the current transition progress', () => {
    const animationFrames = createAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(
      onTransitionChange,
      animationFrames.scheduler,
    )

    controller.start('narrow', 'wide', false)
    animationFrames.run(1, 1_000)
    animationFrames.run(2, 1_050)

    controller.start('wide', 'narrow', false)

    expect(controller.current).toEqual({from: 'narrow', progress: 0.5, to: 'wide'})
    expect(animationFrames.scheduler.cancelAnimationFrame).toHaveBeenCalledWith(3)

    animationFrames.run(4, 1_050)
    animationFrames.run(5, 1_075)
    expect(controller.current).toEqual({from: 'narrow', progress: 0.25, to: 'wide'})

    animationFrames.run(6, 1_100)
    expect(controller.current).toBeNull()
  })

  it('should cancel an active frame and ignore a late frame after destruction', () => {
    const animationFrames = createAnimationFrames()
    const onTransitionChange = vi.fn()
    const controller = createPMouthTransitionController(
      onTransitionChange,
      animationFrames.scheduler,
    )

    controller.start('rest', 'round', false)
    const lateFrame = animationFrames.getCallback(1)
    controller.destroy()

    expect(controller.current).toBeNull()
    expect(animationFrames.scheduler.cancelAnimationFrame).toHaveBeenCalledWith(1)

    lateFrame(1_050)
    expect(onTransitionChange).toHaveBeenCalledOnce()
  })
})
