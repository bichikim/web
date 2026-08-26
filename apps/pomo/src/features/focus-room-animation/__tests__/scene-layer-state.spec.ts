import {describe, expect, it} from 'vitest'

import {
  FOCUS_ROOM_JAW_CHANNEL,
  FOCUS_ROOM_MOUTH_CHANNELS,
  FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS,
  P_MOUTH_TRANSITION_STAGES,
} from '../scene-catalog-channels'
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

  it('should keep both mouths visible with equal-power opacity during a crossfade', () => {
    const state = createFocusRoomLayerState('narrow', false, {
      from: 'open',
      progress: 0.25,
      to: 'narrow',
    })

    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]).toEqual({
      opacity: Math.sqrt(0.75),
      visible: true,
    })
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.narrow]).toEqual({
      opacity: 0.5,
      visible: true,
    })
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.closed]).toEqual({
      opacity: 0,
      visible: false,
    })
    expect(state.channels?.[FOCUS_ROOM_JAW_CHANNEL]?.pixelPushProgress).toBeCloseTo(0.78)
  })

  it('should pass open-to-wide transitions through the configured bridge frames', () => {
    const state = createFocusRoomLayerState('wide', false, {
      from: 'open',
      progress: 1 / 3,
      to: 'wide',
    })

    expect(state.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['open-wide-early']]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(0)
    expect(state.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.wide]?.opacity).toBe(0)
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

  it('should pass closed-to-open transitions through the lower-face bridge frames', () => {
    const release = createFocusRoomLayerState('open', false, {
      from: 'closed',
      progress: 0.25,
      to: 'open',
    })
    const betweenStages = createFocusRoomLayerState('open', false, {
      from: 'closed',
      progress: 0.375,
      to: 'open',
    })

    expect(release.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS.release]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(release.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.closed]?.opacity).toBe(0)
    expect(release.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.open]?.opacity).toBe(0)
    expect(betweenStages.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS.release]?.opacity).toBe(
      Math.SQRT1_2,
    )
    expect(
      betweenStages.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['small-open']]?.opacity,
    ).toBe(Math.SQRT1_2)
  })

  it('should use the configured bridge frames for every generated transition path', () => {
    const forward = createFocusRoomLayerState('wide', false, {
      from: 'closed',
      progress: 1 / 3,
      to: 'wide',
    })
    const reverse = createFocusRoomLayerState('closed', false, {
      from: 'wide',
      progress: 1 / 3,
      to: 'closed',
    })

    expect(forward.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['closed-wide-early']]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(reverse.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['closed-wide-late']]).toEqual({
      opacity: 1,
      visible: true,
    })
  })

  it('should render the four registered closed-to-round frames in both directions', () => {
    const early = createFocusRoomLayerState('round', false, {
      from: 'closed',
      progress: 1 / 3,
      to: 'round',
    })
    const late = createFocusRoomLayerState('round', false, {
      from: 'closed',
      progress: 2 / 3,
      to: 'round',
    })
    const reverseEarly = createFocusRoomLayerState('closed', false, {
      from: 'round',
      progress: 1 / 3,
      to: 'closed',
    })

    expect(early.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['closed-round-early']]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(late.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['closed-round-late']]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(
      reverseEarly.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['closed-round-late']],
    ).toEqual({opacity: 1, visible: true})
  })

  it('should reuse the bridge frames in reverse for open-to-closed transitions', () => {
    const state = createFocusRoomLayerState('closed', false, {
      from: 'open',
      progress: 0.25,
      to: 'closed',
    })

    expect(state.channels?.[FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS['half-open']]).toEqual({
      opacity: 1,
      visible: true,
    })
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

  it('should use only the base mouth at each generated transition endpoint', () => {
    const first = createFocusRoomLayerState('wide', false, {
      from: 'closed',
      progress: 0,
      to: 'wide',
    })
    const last = createFocusRoomLayerState('wide', false, {
      from: 'closed',
      progress: 1,
      to: 'wide',
    })

    expect(first.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.closed]).toEqual({
      opacity: 1,
      visible: true,
    })
    expect(last.channels?.[FOCUS_ROOM_MOUTH_CHANNELS.wide]).toEqual({
      opacity: 1,
      visible: true,
    })

    for (const channel of Object.values(FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS)) {
      expect(first.channels?.[channel]?.visible).toBe(false)
      expect(last.channels?.[channel]?.visible).toBe(false)
    }
  })
})
