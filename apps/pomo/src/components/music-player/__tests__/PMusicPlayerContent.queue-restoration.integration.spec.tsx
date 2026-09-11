/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PAlbumLibrary} from '../../PAlbumLibrary'
import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {AlbumLibraryFixture} from './test-support/AlbumLibraryFixture'
import {
  ADDED_TRACK,
  getAudioElement,
  markAudioMetadataReady,
  TRACKS,
} from './test-support/player-fixtures'

const albumPreviewMocks = vi.hoisted(() => ({stop: vi.fn()}))
const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('media-chrome', () => ({}))
vi.mock('../../PAlbumLibrary', () => ({PAlbumLibrary: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

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

describe('PMusicPlayerContent queue restoration integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(PAlbumLibrary).mockImplementation((props) => (
      <AlbumLibraryFixture {...props} stopPreview={albumPreviewMocks.stop} />
    ))
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
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should resume playback when the saved track was playing', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({isPlaying: true, positionSeconds: 22, savedAt: 1, trackId: 'three'}),
    )
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    const audio = getAudioElement(result.container)

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
    expect(
      screen.getByText('집중 음악을 준비 중이에요', {selector: '.pomo-overflow-marquee__content'}),
    ).toBeTruthy()
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
    const audio = getAudioElement(result.container)

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/two.mp3'))
    fireEvent(audio, new Event('play'))
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
    fireEvent.click(screen.getByRole('button', {name: '재생목록 모두 비우기'}))

    expect(audio.getAttribute('src')).toBeNull()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()
    expect(
      screen.getByText('집중 음악을 준비 중이에요', {selector: '.pomo-overflow-marquee__content'}),
    ).toBeTruthy()
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
    const audio = getAudioElement(result.container)

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/two.mp3'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.keyDown(screen.getByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'}), {
      key: 'Delete',
    })

    await waitFor(() => expect(audio.getAttribute('src')).toBe('/three.mp3'))
    expect(screen.queryByLabelText('Two · Artist · 밀어서 삭제', {selector: 'button'})).toBeNull()
  })
})
