import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  FOCUS_ROOM_MOUTH_CHANNELS,
  FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS,
} from '../scene-catalog-channels'
import {createPSceneMouthController} from '../scene-mouth-controller'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createPSceneMouthController', () => {
  it('should crossfade both mouth sprites before settling on the anticipated viseme', () => {
    const frames: Array<FrameRequestCallback> = []
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const update = vi.fn()
    const controller = createPSceneMouthController(() => [{update}, null])

    controller.update('rest', 'round', false)

    const initialState = update.mock.lastCall?.[0]
    expect(initialState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.rest]?.opacity).toBe(1)
    expect(initialState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(0)

    frames.shift()?.(1_050)

    const halfwayState = update.mock.lastCall?.[0]
    expect(halfwayState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.rest]?.opacity).toBe(Math.SQRT1_2)
    expect(halfwayState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(Math.SQRT1_2)

    frames.shift()?.(1_100)

    const settledState = update.mock.lastCall?.[0]
    expect(settledState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.rest]?.opacity).toBe(0)
    expect(settledState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(1)
    controller.destroy()
  })

  it('should reverse from the current bridge frame when returning to the previous viseme', () => {
    const frames: Array<FrameRequestCallback> = []
    let now = 1_000
    vi.spyOn(window.performance, 'now').mockImplementation(() => now)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const update = vi.fn()
    const controller = createPSceneMouthController(() => [{update}, null])

    controller.update('narrow', 'wide', false)
    frames.shift()?.(1_050)

    expect(
      update.mock.lastCall?.[0].channels?.[
        FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['narrow-wide-middle']
      ]?.opacity,
    ).toBe(1)

    now = 1_050
    controller.update('wide', 'narrow', false)

    expect(
      update.mock.lastCall?.[0].channels?.[
        FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['narrow-wide-middle']
      ]?.opacity,
    ).toBe(1)

    frames.pop()?.(1_075)

    expect(
      update.mock.lastCall?.[0].channels?.[
        FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['narrow-wide-early']
      ]?.opacity,
    ).toBe(1)

    frames.pop()?.(1_100)

    expect(update.mock.lastCall?.[0].channels?.[FOCUS_ROOM_MOUTH_CHANNELS.narrow]?.opacity).toBe(1)
    controller.destroy()
  })

  it('should apply the active viseme immediately when the viseme is unchanged', () => {
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1)
    const firstUpdate = vi.fn()
    const secondUpdate = vi.fn()
    const controller = createPSceneMouthController(() => [
      {update: firstUpdate},
      {update: secondUpdate},
    ])

    controller.update('round', 'round', false)

    const layerState = firstUpdate.mock.lastCall?.[0]
    expect(layerState.animationEnabled).toBe(true)
    expect(layerState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(1)
    expect(secondUpdate).toHaveBeenCalledWith(layerState)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    controller.destroy()
  })

  it('should cancel an active transition when reduced motion is enabled', () => {
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7)
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)
    const update = vi.fn()
    const controller = createPSceneMouthController(() => [{update}, null])

    controller.update('rest', 'wide', false)
    controller.setReducedMotion('wide', true)

    const reducedState = update.mock.lastCall?.[0]
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
    expect(reducedState.animationEnabled).toBe(false)
    expect(reducedState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.wide]?.opacity).toBe(1)

    controller.setReducedMotion('rest', false)

    const animatedState = update.mock.lastCall?.[0]
    expect(cancelAnimationFrame).toHaveBeenCalledOnce()
    expect(animatedState.animationEnabled).toBe(true)
    expect(animatedState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.rest]?.opacity).toBe(1)
    controller.destroy()
  })
})
