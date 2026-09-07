import {describe, expect, it, vi} from 'vitest'

import {createPreviewPlayback} from '../preview-playback'

describe('createPreviewPlayback', () => {
  it('should retain the active preview stop callback when main playback resume is prevented', () => {
    const pausePlayer = vi.fn()
    const playPlayer = vi.fn()
    const stopPreview = vi.fn()
    const preview = createPreviewPlayback({
      isPlaying: () => true,
      pausePlayer,
      playPlayer,
    })

    preview.start(stopPreview)
    preview.preventResume()
    preview.stopBeforePlayback()

    expect(pausePlayer).toHaveBeenCalledOnce()
    expect(stopPreview).toHaveBeenCalledOnce()
    expect(playPlayer).not.toHaveBeenCalled()
  })
})
