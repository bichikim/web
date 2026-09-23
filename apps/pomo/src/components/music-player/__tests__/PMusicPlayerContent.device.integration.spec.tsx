/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {TRACKS} from './test-support/player-fixtures'

vi.mock('media-chrome', () => ({}))

const dispatchMediaSessionAction = (
  handlers: Map<string, MediaSessionActionHandler | null>,
  action: 'nexttrack' | 'previoustrack',
) => {
  const handler = handlers.get(action)

  if (handler === undefined || handler === null) {
    throw new Error(`Expected a ${action} media session handler`)
  }

  handler({action})
}

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

    const result = render(() => <PMusicPlayerContent tracks={[track]} />, {
      wrapper: PreferenceProvider,
    })
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

  it('should stop repeat-disabled boundary navigation from buttons and media session actions', () => {
    const handlers = new Map<string, MediaSessionActionHandler | null>()
    const mediaSession = {
      metadata: null,
      playbackState: 'none',
      setActionHandler: (action: string, handler: MediaSessionActionHandler | null) =>
        handlers.set(action, handler),
    }
    Object.defineProperty(navigator, 'mediaSession', {configurable: true, value: mediaSession})

    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />, {
      wrapper: PreferenceProvider,
    })
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '전체 반복'}))
    fireEvent.click(screen.getByRole('button', {name: '랜덤 재생'}))

    const previousButton = screen.getByRole('button', {name: '이전 곡'}) as HTMLButtonElement
    const nextButton = screen.getByRole('button', {name: '다음 곡'}) as HTMLButtonElement
    for (let attempt = 0; attempt < TRACKS.length && !previousButton.disabled; attempt += 1) {
      fireEvent.click(previousButton)
    }
    expect(previousButton).toBeDisabled()

    const firstSource = audio.getAttribute('src')
    const firstPlayCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
    dispatchMediaSessionAction(handlers, 'previoustrack')
    expect(audio.getAttribute('src')).toBe(firstSource)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(firstPlayCount)

    for (let attempt = 0; attempt < TRACKS.length && !nextButton.disabled; attempt += 1) {
      fireEvent.click(nextButton)
    }
    expect(nextButton).toBeDisabled()

    const lastSource = audio.getAttribute('src')
    const lastPlayCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
    fireEvent(audio, new Event('ended'))
    dispatchMediaSessionAction(handlers, 'nexttrack')
    expect(audio.getAttribute('src')).toBe(lastSource)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(lastPlayCount)

    result.unmount()
  })

  it('should keep media next inert after a repeat-disabled shuffled cycle ends', () => {
    const handlers = new Map<string, MediaSessionActionHandler | null>()
    const mediaSession = {
      metadata: null,
      playbackState: 'none',
      setActionHandler: (action: string, handler: MediaSessionActionHandler | null) =>
        handlers.set(action, handler),
    }
    Object.defineProperty(navigator, 'mediaSession', {configurable: true, value: mediaSession})

    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />, {
      wrapper: PreferenceProvider,
    })
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '전체 반복'}))
    const nextButton = screen.getByRole('button', {name: '다음 곡'}) as HTMLButtonElement
    const shuffledSources = new Set<string | null>([audio.getAttribute('src')])

    for (let attempt = 0; attempt < TRACKS.length && !nextButton.disabled; attempt += 1) {
      fireEvent.click(nextButton)
      shuffledSources.add(audio.getAttribute('src'))
    }
    expect(nextButton).toBeDisabled()
    expect(shuffledSources.size).toBe(TRACKS.length)

    const endedSource = audio.getAttribute('src')
    const playCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
    fireEvent(audio, new Event('ended'))
    dispatchMediaSessionAction(handlers, 'nexttrack')
    expect(audio.getAttribute('src')).toBe(endedSource)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(playCount)

    result.unmount()
  })
})
