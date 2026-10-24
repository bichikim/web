/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {createPreviewPlayback} from '../preview-playback'

describe('createPreviewPlayback', () => {
  it('should resume main playback after replacing an active preview', () => {
    let playing = true
    const pausePlayer = vi.fn(() => {
      playing = false
    })
    const playPlayer = vi.fn(() => {
      playing = true
    })
    const firstStopPreview = vi.fn()
    const secondStopPreview = vi.fn()
    const preview = createPreviewPlayback({
      isPlaying: () => playing,
      pausePlayer,
      playPlayer,
    })
    firstStopPreview.mockImplementation(() => preview.finish())

    preview.start(firstStopPreview)
    preview.start(secondStopPreview)
    preview.finish()

    expect(firstStopPreview).toHaveBeenCalledOnce()
    expect(secondStopPreview).not.toHaveBeenCalled()
    expect(playPlayer).toHaveBeenCalledOnce()
    expect(playing).toBe(true)
  })

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
