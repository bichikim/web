/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {createLoopPlaybackControls} from '../features/loop-player/create-loop-playback-controls'
import type {LoopPlayback} from '../features/loop-player/player'

const createPlayback = (seek: LoopPlayback['seek']): LoopPlayback => ({
  close: async () => {},
  play: async () => true,
  seek,
  setVolume: () => {},
  stop: () => {},
})

it('should restore the pre-scrub playback position when a seek fails after cancelScrubbing', async () => {
  const onSeekError = vi.fn()
  const player = createPlayback(async () => {
    throw new Error('seek failed')
  })
  const root = createRoot((dispose) => ({
    controls: createLoopPlaybackControls({onSeekError, player: () => player}),
    dispose,
  }))

  try {
    root.controls.updatePosition(4)
    root.controls.previewPosition(8)
    root.controls.cancelScrubbing()
    await root.controls.seek()
    expect(root.controls.position()).toBe(4)
  } finally {
    root.dispose()
  }
})
