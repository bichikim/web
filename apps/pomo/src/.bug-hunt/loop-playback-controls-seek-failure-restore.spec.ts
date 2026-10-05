/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {createLoopPlaybackControls} from '../features/loop-player/create-loop-playback-controls'
import type {LoopPlayback} from '../features/loop-player/player'

const createRejectingPlayer = (): LoopPlayback => ({
  close: async () => {},
  play: async () => {},
  seek: async () => {
    throw new Error('seek failed')
  },
  setVolume: () => {},
  stop: () => {},
})

it('should restore the last playback position when seek fails without a scrub preview', async () => {
  const onSeekError = vi.fn()
  const player = createRejectingPlayer()
  const root = createRoot((dispose) => ({
    controls: createLoopPlaybackControls({
      onSeekError,
      player: () => player,
    }),
    dispose,
  }))

  try {
    root.controls.updatePosition(4)
    await root.controls.seek()
    expect(root.controls.position()).toBe(4)
    expect(onSeekError).toHaveBeenCalledOnce()
  } finally {
    root.dispose()
  }
})

it('should restore the pre-scrub position when seek fails after cancelScrubbing', async () => {
  const onSeekError = vi.fn()
  const player = createRejectingPlayer()
  const root = createRoot((dispose) => ({
    controls: createLoopPlaybackControls({
      onSeekError,
      player: () => player,
    }),
    dispose,
  }))

  try {
    root.controls.updatePosition(4)
    root.controls.previewPosition(8)
    root.controls.cancelScrubbing()
    await root.controls.seek()
    expect(root.controls.position()).toBe(4)
    expect(onSeekError).toHaveBeenCalledOnce()
  } finally {
    root.dispose()
  }
})
