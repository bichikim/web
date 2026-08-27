/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {useMediaMetadata, useMediaPlayback} from '../media-session'
import {useWindowSize} from '../window-size'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('media session hooks', () => {
  it('should publish metadata artwork and playback state', () => {
    const mediaSession = {metadata: null, playbackState: 'none', setActionHandler: vi.fn()}
    Object.defineProperty(navigator, 'mediaSession', {configurable: true, value: mediaSession})
    let metadataInput: MediaMetadataInit | undefined
    class MediaMetadataMock {
      constructor(value: MediaMetadataInit) {
        metadataInput = value
      }
    }
    vi.stubGlobal('MediaMetadata', MediaMetadataMock)

    renderHook(() => {
      useMediaMetadata(
        () => ({album: 'Album', artist: 'Artist', artwork: '/cover.png', title: 'Title'}),
        {
          artworkFactory: (url, size) => `${url}?size=${size.width}`,
          artworks: [{height: 128, type: 'image/png', width: 128}],
        },
      )
      useMediaPlayback(() => true)
    })

    expect(metadataInput).toMatchObject({
      artwork: [{sizes: '128x128', src: '/cover.png?size=128', type: 'image/png'}],
      title: 'Title',
    })
    expect(mediaSession.playbackState).toBe('paused')
  })
})

describe('useWindowSize', () => {
  it('should initialize MIDI layout size from the browser window', () => {
    const view = renderHook(() => useWindowSize({height: 100, width: 200}))

    expect(view.result()).toEqual({height: window.innerHeight, width: window.innerWidth})
  })
})
