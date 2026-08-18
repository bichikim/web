/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import PMusicPlayerContent from '../PMusicPlayerContent'

vi.mock('media-chrome', () => ({}))

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
  {artist: 'Artist', durationSeconds: 1, id: 'three', source: '/three.mp3', title: 'Three'},
] as const

describe('PMusicPlayerContent', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.getItem.mockResolvedValue(null)
    storageMocks.setItem.mockReset()
    storageMocks.setItem.mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should start a new shuffled cycle when repeat all is enabled', async () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    expect(screen.getByRole('button', {name: '전체 반복'}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', {name: '랜덤 재생'}).getAttribute('aria-pressed')).toBe(
      'true',
    )

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/three.mp3')

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/one.mp3')

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/three.mp3')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3)
  })

  it('should preserve playing state when an obsolete play request is aborted', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException('The play request was interrupted', 'AbortError'),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent(audio, new Event('play'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '다음 곡'}))
    await Promise.resolve()
    await Promise.resolve()

    const firstLevel = result.container.querySelector<HTMLElement>('.pomo-level')
    expect(firstLevel?.style.opacity).toBe('0.76')
  })

  it('should notify a controlled owner when the player expansion changes', () => {
    const [expanded, setExpanded] = createSignal(false)
    const handleExpandedChange = vi.fn((nextExpanded: boolean) => setExpanded(nextExpanded))

    render(() => (
      <PMusicPlayerContent
        expanded={expanded()}
        onExpandedChange={handleExpandedChange}
        tracks={TRACKS}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    expect(handleExpandedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', {name: '플레이어 접기'})).toBeTruthy()
  })

  it('should hide the expanded play button tooltip', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    const playButtons = result.container.querySelectorAll('media-play-button')
    expect(playButtons).toHaveLength(2)
    expect(playButtons[0]?.hasAttribute('notooltip')).toBe(false)
    expect(playButtons[1]?.hasAttribute('notooltip')).toBe(true)
    expect(playButtons[1]?.getAttribute('aria-label')).toBe('재생 또는 일시 정지')
  })

  it('should leave the summary transition overridable for reduced motion', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const summaryPlayButton = result.container.querySelector(
      'media-play-button.pomo-player__play--summary',
    )

    if (!(summaryPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo summary play button to be rendered')
    }

    expect(summaryPlayButton.style.transition).toBe('')
    expect(summaryPlayButton.style.getPropertyValue('--pomo-player-summary-transition')).toContain(
      'width 260ms ease',
    )
    expect(summaryPlayButton.classList.contains('motion-reduce:transition-[none]')).toBe(true)
  })

  it('should report the current track when selection changes', async () => {
    const onTrackChange = vi.fn()
    const result = render(() => (
      <PMusicPlayerContent onTrackChange={onTrackChange} tracks={TRACKS} />
    ))
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[1])
    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[2])
  })

  it('should restore the saved track and playback position', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))

    expect(audio.getAttribute('src')).toBe('/three.mp3')
    expect(audio.currentTime).toBe(22)
  })

  it('should resume playback when the saved track was playing', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: true, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })

  it('should remain paused when the browser blocks restored playback', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException('Playback requires user interaction', 'NotAllowedError'),
    )
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: true, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))
    await Promise.resolve()
    await Promise.resolve()

    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      isPlaying: false,
      positionSeconds: 22,
      trackId: 'three',
    })
  })

  it('should not overwrite playback changed before native restoration finishes', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    let completeRead: ((value: string | null) => void) | undefined
    storageMocks.getItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeRead = resolve
        }),
    )
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: false, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent(audio, new Event('play'))
    completeRead?.(null)
    await Promise.resolve()
    await Promise.resolve()

    expect(audio.getAttribute('src')).toBe('/two.mp3')
  })

  it('should not overwrite a position sought before native restoration finishes', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    let completeRead: ((value: string | null) => void) | undefined
    storageMocks.getItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeRead = resolve
        }),
    )
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: false, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    audio.currentTime = 9
    fireEvent(audio, new Event('seeking'))
    completeRead?.(null)
    await Promise.resolve()
    await Promise.resolve()

    expect(audio.getAttribute('src')).toBe('/two.mp3')
    expect(audio.currentTime).toBe(9)
  })

  it('should not overwrite a same-track seek when metadata loads after restoration', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: false, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/three.mp3')

    audio.currentTime = 9
    fireEvent(audio, new Event('seeking'))
    fireEvent(audio, new Event('loadedmetadata'))

    expect(audio.currentTime).toBe(9)
  })

  it('should load the playlist without waiting for native storage', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockImplementationOnce(
      () =>
        new Promise(() => {
          // Intentionally pending to reproduce an unresponsive native bridge.
        }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({tracks: TRACKS, version: 1}),
        ok: true,
      }),
    )
    const result = render(() => <PMusicPlayerContent />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(audio.getAttribute('src')).toBe('/two.mp3')
  })

  it('should ignore an obsolete blocked-autoplay result after playback starts', async () => {
    let rejectPlayback: ((error: DOMException) => void) | undefined
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectPlayback = reject
        }),
    )
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: true, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    fireEvent(audio, new Event('play'))
    rejectPlayback?.(new DOMException('Playback requires user interaction', 'NotAllowedError'))
    await Promise.resolve()

    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      isPlaying: true,
      trackId: 'three',
    })
  })

  it('should reset to the first track when the saved track is missing', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({positionSeconds: 22, savedAt: 1, trackId: 'removed'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))
    await Promise.resolve()

    expect(audio.getAttribute('src')).toBe('/one.mp3')
    expect(audio.currentTime).toBe(0)
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      positionSeconds: 0,
      trackId: 'one',
    })
  })

  it('should save progress periodically and immediately after seeking', async () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await Promise.resolve()
    audio.currentTime = 7
    fireEvent(audio, new Event('timeupdate'))
    await Promise.resolve()
    await Promise.resolve()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      positionSeconds: 7,
    })

    audio.currentTime = 8
    fireEvent(audio, new Event('timeupdate'))
    await Promise.resolve()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      positionSeconds: 7,
    })

    fireEvent(audio, new Event('seeked'))
    await Promise.resolve()
    await Promise.resolve()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      positionSeconds: 8,
    })
  })

  it('should stop detached audio without clearing its playing state', async () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent(audio, new Event('play'))
    result.unmount()
    await Promise.resolve()

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      isPlaying: true,
    })
  })
})
