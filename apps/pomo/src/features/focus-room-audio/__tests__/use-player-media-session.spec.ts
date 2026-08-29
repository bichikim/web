/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {PTrack} from '../focus-room-playlist'
import {usePlayerMediaSession} from '../use-player-media-session'

const TRACK: PTrack = {
  artist: 'Pomo Artist',
  durationSeconds: 120,
  id: 'track-one',
  source: '/audio/track-one.mp3',
  title: 'Track One',
}

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const installMediaSession = (unsupportedAction?: MediaSessionAction) => {
  const handlers = new Map<MediaSessionAction, MediaSessionActionHandler | null>()
  const setActionHandler = vi.fn(
    (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      if (action === unsupportedAction) {
        throw new TypeError(`Unsupported action: ${action}`)
      }

      handlers.set(action, handler)
    },
  )
  const mediaSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler,
  }
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: mediaSession,
  })
  return {handlers, mediaSession, setActionHandler}
}

const createMediaSessionRoot = (initialTrack: PTrack | undefined, initiallyPlaying = false) => {
  const onNextTrack = vi.fn()
  const onPause = vi.fn()
  const onPlay = vi.fn()
  const onPreviousTrack = vi.fn()

  return createRoot((dispose) => {
    const [currentTrack, setCurrentTrack] = createSignal(initialTrack)
    const [isPlaying, setIsPlaying] = createSignal(initiallyPlaying)
    usePlayerMediaSession({
      currentTrack,
      isPlaying,
      onNextTrack,
      onPause,
      onPlay,
      onPreviousTrack,
    })
    return {
      dispose,
      onNextTrack,
      onPause,
      onPlay,
      onPreviousTrack,
      setCurrentTrack,
      setIsPlaying,
    }
  })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaSession')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('usePlayerMediaSession', () => {
  it('should remain inactive when Media Session is unavailable', async () => {
    Reflect.deleteProperty(navigator, 'mediaSession')

    const root = createMediaSessionRoot(TRACK)
    await flushEffects()

    expect(root.onPlay).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should synchronize metadata, playback, transport actions, and cleanup', async () => {
    const metadataInitializations: MediaMetadataInit[] = []
    const {handlers, mediaSession, setActionHandler} = installMediaSession()
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(initialization: MediaMetadataInit = {}) {
          metadataInitializations.push(initialization)
        }
      },
    )
    const root = createMediaSessionRoot(TRACK)
    await flushEffects()

    expect(metadataInitializations).toEqual([
      {artist: 'Pomo Artist', artwork: [], title: 'Track One'},
    ])
    expect(mediaSession.playbackState).toBe('paused')

    handlers.get('nexttrack')?.({action: 'nexttrack'})
    handlers.get('pause')?.({action: 'pause'})
    handlers.get('play')?.({action: 'play'})
    handlers.get('previoustrack')?.({action: 'previoustrack'})

    expect(root.onNextTrack).toHaveBeenCalledOnce()
    expect(root.onPause).toHaveBeenCalledOnce()
    expect(root.onPlay).toHaveBeenCalledOnce()
    expect(root.onPreviousTrack).toHaveBeenCalledOnce()

    root.setIsPlaying(true)
    await flushEffects()
    expect(mediaSession.playbackState).toBe('playing')

    root.setCurrentTrack({...TRACK, artworkUrl: '/audio/track-one.jpg'})
    await flushEffects()
    expect(metadataInitializations).toContainEqual({
      artist: 'Pomo Artist',
      artwork: [{src: '/audio/track-one.jpg'}],
      title: 'Track One',
    })

    root.setCurrentTrack(undefined)
    await flushEffects()
    expect(mediaSession.metadata).toBeNull()
    expect(mediaSession.playbackState).toBe('none')

    root.dispose()
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', null)
    expect(setActionHandler).toHaveBeenCalledWith('pause', null)
    expect(setActionHandler).toHaveBeenCalledWith('play', null)
    expect(setActionHandler).toHaveBeenCalledWith('previoustrack', null)
  })

  it('should clear metadata and tolerate an unsupported media action', async () => {
    const {mediaSession, setActionHandler} = installMediaSession('previoustrack')
    vi.stubGlobal('MediaMetadata', undefined)

    const root = createMediaSessionRoot(TRACK)
    await flushEffects()

    expect(mediaSession.metadata).toBeNull()
    expect(mediaSession.playbackState).toBe('paused')
    expect(setActionHandler).toHaveBeenCalledTimes(4)

    expect(root.dispose).not.toThrow()
    expect(setActionHandler).toHaveBeenCalledTimes(8)
  })
})
