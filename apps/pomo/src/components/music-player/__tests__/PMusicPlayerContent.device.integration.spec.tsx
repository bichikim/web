/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {TRACKS} from './test-support/player-fixtures'

vi.mock('media-chrome', () => ({}))

describe('PMusicPlayerContent device integration', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(navigator, 'mediaSession')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should expose track artwork and transport controls to the device media session', () => {
    const metadataInitializations: MediaMetadataInit[] = []
    const setActionHandler = vi.fn()
    const mediaSession = {metadata: null, playbackState: 'none', setActionHandler}
    const track = {...TRACKS[0], artworkUrl: '/audio/artwork/one.jpg'}

    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(initialization: MediaMetadataInit = {}) {
          metadataInitializations.push(initialization)
        }
      },
    )
    Object.defineProperty(navigator, 'mediaSession', {configurable: true, value: mediaSession})

    const result = render(() => <PMusicPlayerContent tracks={[track]} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    expect(metadataInitializations).toEqual([
      {artist: 'Artist', artwork: [{src: '/audio/artwork/one.jpg'}], title: 'One'},
    ])
    expect(mediaSession.playbackState).toBe('paused')
    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function))
    expect(setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function))
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function))
    expect(setActionHandler).toHaveBeenCalledWith('previoustrack', expect.any(Function))

    fireEvent(audio, new Event('play'))
    expect(mediaSession.playbackState).toBe('playing')

    result.unmount()
    expect(mediaSession.metadata).toBeNull()
    expect(mediaSession.playbackState).toBe('none')
    expect(setActionHandler).toHaveBeenCalledWith('play', null)
  })
})
