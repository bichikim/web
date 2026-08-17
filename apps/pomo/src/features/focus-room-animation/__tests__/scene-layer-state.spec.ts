import {describe, expect, it} from 'vitest'

import {FOCUS_ROOM_JAW_CHANNEL, FOCUS_ROOM_MOUTH_CHANNELS} from '../scene-catalog-channels'
import {createFocusRoomLayerState} from '../scene-layer-state'

describe('createFocusRoomLayerState', () => {
  it('should show only the active mouth when no transition is running', () => {
    const state = createFocusRoomLayerState('open', false)

    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]).toEqual({
      opacity: 0,
      visible: false,
    })
    expect(state.channels?.[FOCUS_ROOM_JAW_CHANNEL]).toEqual({pixelPushProgress: 1})
  })

  it('should crossfade the current and next mouth with complementary opacity', () => {
    const state = createFocusRoomLayerState('round', false, {
      from: 'open',
      progress: 0.25,
      to: 'round',
    })

    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]).toEqual({
      opacity: 0.75,
      visible: true,
    })
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]).toEqual({
      opacity: 0.25,
      visible: true,
    })
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.closed]).toEqual({
      opacity: 0,
      visible: false,
    })
    expect(state.channels?.[FOCUS_ROOM_JAW_CHANNEL]).toEqual({pixelPushProgress: 0.875})
  })

  it('should interpolate jaw movement without altering the mouth transition timing', () => {
    const state = createFocusRoomLayerState('rest', false, {
      from: 'open',
      progress: 0.5,
      to: 'rest',
    })

    expect(state.channels?.[FOCUS_ROOM_JAW_CHANNEL]?.pixelPushProgress).toBe(0.5)
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.pixelPushProgress).toBeUndefined()
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.rest]?.pixelPushProgress).toBeUndefined()
  })

  it('should clamp transition progress at both ends', () => {
    const before = createFocusRoomLayerState('round', false, {
      from: 'open',
      progress: -1,
      to: 'round',
    })
    const after = createFocusRoomLayerState('round', false, {
      from: 'open',
      progress: 2,
      to: 'round',
    })

    expect(before.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(1)
    expect(before.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(0)
    expect(after.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(0)
    expect(after.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.round]?.opacity).toBe(1)
  })
})
