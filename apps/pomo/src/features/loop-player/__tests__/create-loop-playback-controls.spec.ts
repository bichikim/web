/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {createLoopPlaybackControls} from '../create-loop-playback-controls'
import type {LoopPlayback} from '../player'

const createPlayback = (seek: LoopPlayback['seek']): LoopPlayback => ({
  close: async () => {},
  play: async () => {},
  seek,
  setVolume: () => {},
  stop: () => {},
})
it('should suppress position updates during preview and restore position on failure', async () => {
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
    root.controls.previewPosition(9)
    root.controls.updatePosition(5)
    expect(root.controls.position()).toBe(9)
    await root.controls.seek()
    expect(root.controls.position()).toBe(4)
    expect(onSeekError).toHaveBeenCalledOnce()
  } finally {
    root.dispose()
  }
})
it.each(['preview', 'invalidate', 'replace'] as const)(
  'should ignore a failed seek superseded by %s',
  async (action) => {
    const deferred = Promise.withResolvers<void>()
    let player = createPlayback(() => deferred.promise)
    const onSeekError = vi.fn()
    const root = createRoot((dispose) => ({
      controls: createLoopPlaybackControls({onSeekError, player: () => player}),
      dispose,
    }))
    try {
      root.controls.updatePosition(4)
      root.controls.previewPosition(8)
      const seeking = root.controls.seek()
      switch (action) {
        case 'preview':
          root.controls.previewPosition(10)
          break
        case 'invalidate':
          root.controls.invalidate()
          break
        case 'replace':
          player = createPlayback(async () => {})
          break
      }
      deferred.reject(new Error('stale seek'))
      await seeking
      expect(root.controls.position()).toBe(action === 'preview' ? 10 : 8)
      expect(onSeekError).not.toHaveBeenCalled()
    } finally {
      root.dispose()
    }
  },
)
it('should resume position updates after cancellation or a seek without a player', async () => {
  const root = createRoot((dispose) => ({
    controls: createLoopPlaybackControls({onSeekError: vi.fn(), player: () => undefined}),
    dispose,
  }))
  try {
    root.controls.previewPosition(8)
    root.controls.cancelScrubbing()
    root.controls.updatePosition(2)
    expect(root.controls.position()).toBe(2)
    root.controls.previewPosition(9)
    await root.controls.seek()
    root.controls.updatePosition(3)
    expect(root.controls.position()).toBe(3)
  } finally {
    root.dispose()
  }
})
it('should apply the requested playback position while retaining scrub update suppression', () => {
  const root = createRoot((dispose) => ({
    controls: createLoopPlaybackControls({onSeekError: vi.fn(), player: () => undefined}),
    dispose,
  }))
  try {
    root.controls.previewPosition(12)
    root.controls.preparePlayback(10)
    root.controls.updatePosition(4)
    expect(root.controls.position()).toBe(10)
    root.controls.cancelScrubbing()
    root.controls.updatePosition(4)
    expect(root.controls.position()).toBe(4)
  } finally {
    root.dispose()
  }
})
