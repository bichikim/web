/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import {
  getCurrentPlaybackTransition,
  persistRestoredPlayback,
  type PlaybackRestoreTransition,
  type TrackLoadTransition,
} from '../playback-transition'

const RESTORED_PLAYBACK = {
  isPlaying: true,
  positionSeconds: 3,
  trackId: 'track-1',
} as const

const createTransition = (): PlaybackRestoreTransition => ({
  pauseProtected: true,
  phase: 'restoring',
  playback: RESTORED_PLAYBACK,
  seekPending: true,
})

const LOADING_TRANSITION: TrackLoadTransition = {
  pauseProtected: true,
  phase: 'loading',
  trackId: 'track-1',
}

it('should discard restoration state for a different current track', () => {
  const transition = createTransition()

  expect(getCurrentPlaybackTransition(transition, 'track-2')).toBeNull()
  expect(getCurrentPlaybackTransition(transition, 'track-1')).toBe(transition)
})

it('should discard a loading transition for a different current track', () => {
  expect(getCurrentPlaybackTransition(LOADING_TRANSITION, 'track-2')).toBeNull()
  expect(getCurrentPlaybackTransition(LOADING_TRANSITION, 'track-1')).toBe(LOADING_TRANSITION)
})

it('should defer restored playback persistence until its position changes', () => {
  const audio = document.createElement('audio')
  audio.currentTime = RESTORED_PLAYBACK.positionSeconds
  const writePlayback = vi.fn()
  const transition = createTransition()

  expect(
    persistRestoredPlayback({
      element: audio,
      trackId: 'track-1',
      transition,
      writePlayback,
    }),
  ).toBe(true)
  expect(writePlayback).not.toHaveBeenCalled()

  audio.currentTime = 8
  expect(
    persistRestoredPlayback({
      element: audio,
      trackId: 'track-1',
      transition,
      writePlayback,
    }),
  ).toBe(true)
  expect(writePlayback).toHaveBeenLastCalledWith({...RESTORED_PLAYBACK, positionSeconds: 8})
})

it('should persist a reconciled position when restoring paused playback', () => {
  const audio = document.createElement('audio')
  audio.currentTime = RESTORED_PLAYBACK.positionSeconds
  const writePlayback = vi.fn()
  const transition: PlaybackRestoreTransition = {
    ...createTransition(),
    playback: {...RESTORED_PLAYBACK, isPlaying: false},
  }

  expect(
    persistRestoredPlayback({
      element: audio,
      trackId: 'track-1',
      transition,
      writePlayback,
    }),
  ).toBe(true)
  expect(writePlayback).not.toHaveBeenCalled()

  audio.currentTime = 12
  expect(
    persistRestoredPlayback({
      element: audio,
      trackId: 'track-1',
      transition,
      writePlayback,
    }),
  ).toBe(true)
  expect(writePlayback).toHaveBeenLastCalledWith({...transition.playback, positionSeconds: 12})
})
