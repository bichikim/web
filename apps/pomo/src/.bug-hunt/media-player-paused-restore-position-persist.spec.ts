/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import {persistRestoredPlayback} from '../components/media-player/playback-transition'

it('should persist reconciled audio position after a paused playback restore seek', () => {
  const audio = document.createElement('audio')
  audio.currentTime = 12
  const writePlayback = vi.fn()

  expect(
    persistRestoredPlayback({
      element: audio,
      trackId: 'track-1',
      transition: {
        pauseProtected: true,
        phase: 'restoring',
        playback: {isPlaying: false, positionSeconds: 3, trackId: 'track-1'},
        seekPending: false,
      },
      writePlayback,
    }),
  ).toBe(true)

  expect(writePlayback).toHaveBeenCalledWith({
    isPlaying: false,
    positionSeconds: 12,
    trackId: 'track-1',
  })
})
