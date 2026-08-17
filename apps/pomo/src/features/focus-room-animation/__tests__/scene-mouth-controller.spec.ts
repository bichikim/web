import {afterEach, describe, expect, it, vi} from 'vitest'

import {FOCUS_ROOM_MOUTH_CHANNELS} from '../scene-catalog-channels'
import {createPSceneMouthController} from '../scene-mouth-controller'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createPSceneMouthController', () => {
  it('crossfades both mouth sprites before settling on the anticipated viseme', () => {
    const frames: Array<FrameRequestCallback> = []
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const update = vi.fn()
    const controller = createPSceneMouthController(() => [{update}, null])

    controller.update('open', 'round', false)

    const initialState = update.mock.lastCall?.[0]
    expect(initialState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(1)
    expect(initialState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(0)

    frames.shift()?.(1_025)

    const halfwayState = update.mock.lastCall?.[0]
    expect(halfwayState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(0.5)
    expect(halfwayState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(0.5)

    frames.shift()?.(1_050)

    const settledState = update.mock.lastCall?.[0]
    expect(settledState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(0)
    expect(settledState.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(1)
    controller.destroy()
  })
})
