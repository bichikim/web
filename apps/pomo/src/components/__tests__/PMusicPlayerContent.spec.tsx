/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import PMusicPlayerContent from '../music-player/Content'

vi.mock('media-chrome', () => ({}))

const albumPreviewMocks = vi.hoisted(() => ({stop: vi.fn()}))

vi.mock('../PAlbumLibrary', () => ({
  PAlbumLibrary: (props: {
    readonly onAddTracks: (tracks: readonly (typeof ADDED_TRACK)[]) => void
    readonly onClearTracks?: () => void
    readonly onPreviewEnd?: () => void
    readonly onPreviewStart?: (stopPreview: () => void) => void
  }) => (
    <>
      <button onClick={() => props.onAddTracks([ADDED_TRACK])} type="button">
        앨범 추가
      </button>
      <Show when={props.onClearTracks !== undefined}>
        <button onClick={() => props.onClearTracks?.()} type="button">
          재생목록 모두 비우기
        </button>
      </Show>
      <button onClick={() => props.onPreviewStart?.(albumPreviewMocks.stop)} type="button">
        미리듣기 시작
      </button>
      <button onClick={() => props.onPreviewEnd?.()} type="button">
        미리듣기 종료
      </button>
    </>
  ),
}))

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

const ADDED_TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'added',
  source: '/added.mp3',
  title: 'Added',
} as const

const markAudioMetadataReady = (audio: HTMLAudioElement) => {
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
}

const stubPlaylistFetch = (loadCount: number) => {
  const fetchMock = vi.fn()

  for (let index = 0; index < loadCount; index += 1) {
    fetchMock
      .mockResolvedValueOnce({
        json: () => Promise.resolve({tracks: [...TRACKS, ADDED_TRACK], version: 1}),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({trackIds: TRACKS.map((track) => track.id), version: 1}),
        ok: true,
      })
  }

  vi.stubGlobal('fetch', fetchMock)
}

describe('PMusicPlayerContent', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.getItem.mockResolvedValue(null)
    storageMocks.setItem.mockReset()
    storageMocks.setItem.mockResolvedValue()
    albumPreviewMocks.stop.mockReset()
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
      {
        artist: 'Artist',
        artwork: [{src: '/audio/artwork/one.jpg'}],
        title: 'One',
      },
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

  it('should start a new shuffled cycle when repeat all is enabled', async () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    markAudioMetadataReady(audio)

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

  it('should pause active playback for a preview and resume after it ends', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent(audio, new Event('play'))
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
    vi.mocked(HTMLMediaElement.prototype.play).mockClear()
    fireEvent.click(screen.getByRole('button', {name: '미리듣기 시작'}))

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()

    fireEvent(audio, new Event('pause'))
    fireEvent.click(screen.getByRole('button', {name: '미리듣기 종료'}))

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })

  it('should stop an active preview when the main player starts', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    fireEvent.click(screen.getByRole('button', {name: '미리듣기 시작'}))
    fireEvent(audio, new Event('play'))

    expect(albumPreviewMocks.stop).toHaveBeenCalledOnce()
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
    expect(firstLevel?.classList.contains('opacity-76')).toBe(true)
    expect(firstLevel?.style.opacity).toBe('')
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

  it('should render expanded and compact play controls when expanded', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    expect(result.container.querySelector('media-time-display')).toBeNull()
    const expandedPlayButton = result.container.querySelector(
      '.pomo-player__transport-play-frame media-play-button',
    )
    const compactPlayButton = result.container.querySelector(
      '.pomo-player__compact-summary-play media-play-button',
    )

    for (const playButton of [expandedPlayButton, compactPlayButton]) {
      expect(playButton).toBeInstanceOf(HTMLElement)
      expect(playButton?.hasAttribute('notooltip')).toBe(true)
      expect(playButton?.getAttribute('aria-label')).toBe('재생 또는 일시 정지')
    }
  })

  it('should replace the summary play button without a collapse animation when expanded', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const summary = result.container.querySelector('.pomo-player__summary')
    const summaryPlayFrame = summary?.querySelector(':scope > .pomo-player__play-summary-frame')

    if (!(summaryPlayFrame instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo summary play button frame to be rendered')
    }

    expect(summaryPlayFrame.classList.contains('w-11')).toBe(true)
    expect(
      summaryPlayFrame.classList.contains(
        '[transition:width_260ms_ease,_margin-right_260ms_ease,_opacity_180ms_ease]',
      ),
    ).toBe(false)

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    expect(summary?.querySelector(':scope > .pomo-player__play-summary-frame')).toBeNull()
    expect(
      summary?.querySelector('.pomo-player__compact-summary-play .pomo-player__play-summary-frame'),
    ).toBeInstanceOf(HTMLElement)
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

  it('should report the actual playback state', () => {
    const onPlayingChange = vi.fn()
    const result = render(() => (
      <PMusicPlayerContent onPlayingChange={onPlayingChange} tracks={TRACKS} />
    ))
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    expect(onPlayingChange).toHaveBeenLastCalledWith(false)
    fireEvent(audio, new Event('play'))
    expect(onPlayingChange).toHaveBeenLastCalledWith(true)
    fireEvent(audio, new Event('pause'))
    expect(onPlayingChange).toHaveBeenLastCalledWith(false)
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

    markAudioMetadataReady(audio)
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

    markAudioMetadataReady(audio)
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
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({tracks: TRACKS, version: 1}),
          ok: true,
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({trackIds: TRACKS.map((track) => track.id), version: 1}),
          ok: true,
        }),
    )
    const result = render(() => <PMusicPlayerContent />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/two.mp3'))

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/audio/tracks.json',
      expect.objectContaining({cache: 'no-store', signal: expect.any(AbortSignal)}),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/audio/playlist.json',
      expect.objectContaining({cache: 'no-store', signal: expect.any(AbortSignal)}),
    )
  })

  it('should preserve album additions when native playback restoration finishes later', async () => {
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
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({tracks: TRACKS, version: 1}),
          ok: true,
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({trackIds: TRACKS.map((track) => track.id), version: 1}),
          ok: true,
        }),
    )
    render(() => <PMusicPlayerContent />)

    await waitFor(() =>
      expect(
        screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', {name: '앨범 추가'}))
    expect(screen.getByLabelText('Added · Artist · 밀어서 삭제', {selector: 'button'})).toBeTruthy()

    completeRead?.(null)
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.getByLabelText('Added · Artist · 밀어서 삭제', {selector: 'button'})).toBeTruthy()
  })

  it('should restore album additions after the player remounts', async () => {
    stubPlaylistFetch(2)
    const first = render(() => <PMusicPlayerContent />)

    await waitFor(() =>
      expect(
        screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', {name: '앨범 추가'}))
    expect(screen.getByLabelText('Added · Artist · 밀어서 삭제', {selector: 'button'})).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '')).toMatchObject({
      trackIds: ['one', 'two', 'three', 'added'],
      version: 1,
    })
    first.unmount()

    render(() => <PMusicPlayerContent />)

    await waitFor(() =>
      expect(
        screen.getByLabelText('Added · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
  })

  it('should preserve removed tracks after the player remounts', async () => {
    stubPlaylistFetch(2)
    const first = render(() => <PMusicPlayerContent />)

    await waitFor(() =>
      expect(
        screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
    fireEvent.keyDown(screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}), {
      key: 'Delete',
    })
    expect(screen.queryByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'})).toBeNull()
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '')).toMatchObject({
      trackIds: ['one', 'three'],
      version: 1,
    })
    first.unmount()

    render(() => <PMusicPlayerContent />)

    await waitFor(() =>
      expect(
        screen.getByLabelText('Three · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeNull(),
    )
  })

  it('should preserve an empty playlist after the player remounts', async () => {
    stubPlaylistFetch(2)
    const first = render(() => <PMusicPlayerContent />)

    await waitFor(() =>
      expect(
        screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', {name: '재생목록 모두 비우기'}))
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '')).toMatchObject({
      trackIds: [],
      version: 1,
    })
    first.unmount()

    render(() => <PMusicPlayerContent />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.getByText('집중 음악을 준비 중이에요')).toBeTruthy()
    expect(screen.queryByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'})).toBeNull()
  })

  it('should preserve a removal made before the initial playlist finishes loading', async () => {
    let completeTrackCatalog: ((value: unknown) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              completeTrackCatalog = resolve
            }),
        )
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              trackIds: [...TRACKS.map((track) => track.id), ADDED_TRACK.id],
              version: 1,
            }),
          ok: true,
        }),
    )
    render(() => <PMusicPlayerContent />)

    fireEvent.click(screen.getByRole('button', {name: '앨범 추가'}))
    fireEvent.keyDown(screen.getByLabelText('Added · Artist · 밀어서 삭제', {selector: 'button'}), {
      key: 'Delete',
    })
    completeTrackCatalog?.({
      json: () => Promise.resolve({tracks: [...TRACKS, ADDED_TRACK], version: 1}),
      ok: true,
    })

    await waitFor(() =>
      expect(
        screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}),
      ).toBeTruthy(),
    )
    expect(screen.queryByLabelText('Added · Artist · 밀어서 삭제', {selector: 'button'})).toBeNull()
  })

  it('should stop playback and clear every loaded track from the album library', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({tracks: TRACKS, version: 1}),
          ok: true,
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({trackIds: TRACKS.map((track) => track.id), version: 1}),
          ok: true,
        }),
    )
    const result = render(() => <PMusicPlayerContent />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/two.mp3'))
    fireEvent(audio, new Event('play'))
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
    fireEvent.click(screen.getByRole('button', {name: '재생목록 모두 비우기'}))

    expect(audio.getAttribute('src')).toBeNull()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()
    expect(screen.getByText('집중 음악을 준비 중이에요')).toBeTruthy()
  })

  it('should continue with the following track after removing the current loaded track', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({tracks: TRACKS, version: 1}),
          ok: true,
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({trackIds: TRACKS.map((track) => track.id), version: 1}),
          ok: true,
        }),
    )
    const result = render(() => <PMusicPlayerContent />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the Pomo audio element to be rendered')
    }

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/two.mp3'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.keyDown(screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}), {
      key: 'Delete',
    })

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/three.mp3'))
    expect(screen.queryByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'})).toBeNull()
  })
})
