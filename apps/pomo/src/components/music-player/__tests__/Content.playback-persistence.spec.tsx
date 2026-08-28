/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import PMusicPlayerContent from '../Content'

vi.mock('media-chrome', () => ({}))
vi.mock('../../PAlbumLibrary', () => ({PAlbumLibrary: () => null}))

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

const getAudioElement = (container: HTMLElement): HTMLAudioElement => {
  const audio = container.querySelector('audio')

  if (!(audio instanceof HTMLAudioElement)) {
    throw new TypeError('Expected the Pomo audio element to be rendered')
  }

  return audio
}

describe('PMusicPlayerContent playback persistence', () => {
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
    Reflect.deleteProperty(navigator, 'mediaSession')
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should restore the saved track and playback position', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

    await Promise.resolve()
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))

    expect(audio.getAttribute('src')).toBe('/three.mp3')
    expect(audio.currentTime).toBe(22)
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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

    fireEvent(audio, new Event('play'))
    result.unmount()
    await Promise.resolve()

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? '')).toMatchObject({
      isPlaying: true,
    })
  })
})
