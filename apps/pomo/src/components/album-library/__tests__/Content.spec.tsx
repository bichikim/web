/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {
  PPublishedAlbumCatalog,
  PResolvedAlbum,
  PTrack,
  PTrackPreviewRequest,
} from '../../../features/focus-room-audio'

const audioMocks = vi.hoisted(() => ({
  loadBundledPAlbums: vi.fn(),
  loadPublishedPAlbums: vi.fn(),
  useTrackPreview: vi.fn(),
}))
const componentMocks = vi.hoisted(() => ({
  albumCard: vi.fn(),
  button: vi.fn(),
}))
const reporterMocks = vi.hoisted(() => ({reportClientError: vi.fn()}))

vi.mock('../../../features/focus-room-audio', () => audioMocks)
vi.mock('../../../features/client-error-reporter', () => reporterMocks)
vi.mock('../../PButton', () => ({PButton: componentMocks.button}))
vi.mock('../Card', () => ({AlbumCard: componentMocks.albumCard}))

import PAlbumLibraryContent from '../Content'

interface ButtonProps {
  readonly children: JSX.Element
  readonly disabled?: boolean
  readonly onPress: () => unknown
}

interface AlbumCardProps {
  readonly album: PResolvedAlbum
  readonly index: number
  readonly isInPlayer: boolean
  readonly onAddAlbum: (album: PResolvedAlbum) => void
  readonly onAddTrack: (track: PTrack) => void
  readonly onPreview: (request: PTrackPreviewRequest) => void
  readonly pendingTrackId: string | null
  readonly playingTrackId: string | null
  readonly trackIds: ReadonlySet<string>
}

interface PreviewOptions {
  readonly onEnd: () => void
  readonly onStart: (stopPreview: () => void) => void
}

const TRACK_ONE: PTrack = {
  artist: '첫 가수',
  durationSeconds: 180,
  id: 'track-one',
  source: '/track-one.mp3',
  title: '첫 곡',
}
const TRACK_TWO: PTrack = {
  artist: '둘째 가수',
  durationSeconds: 200,
  id: 'track-two',
  source: '/track-two.mp3',
  title: '둘째 곡',
}

const createAlbum = (id: string, tracks: readonly PTrack[]): PResolvedAlbum => ({
  coverImageUrl: '/cover.webp',
  description: `${id} 설명`,
  icon: 'i-tabler-vinyl',
  id,
  title: id,
  trackCount: tracks.length,
  trackIds: tracks.map((track) => track.id),
  trackListings: tracks,
  tracks,
})

let previewOptions: PreviewOptions
let previewError: () => string | null
let previewHandleEnded: () => void
let previewHandleError: () => void
let previewSetAudio: (element: HTMLAudioElement) => void
let previewToggle: (request: PTrackPreviewRequest) => Promise<void>

beforeEach(() => {
  audioMocks.loadBundledPAlbums.mockReset().mockResolvedValue([])
  audioMocks.loadPublishedPAlbums.mockReset().mockResolvedValue({
    albums: [],
    status: 'ready',
  })
  previewError = vi.fn(() => null)
  previewHandleEnded = vi.fn()
  previewHandleError = vi.fn()
  previewSetAudio = vi.fn()
  previewToggle = vi.fn(async () => undefined)
  audioMocks.useTrackPreview.mockImplementation((options: PreviewOptions) => {
    previewOptions = options
    return {
      errorMessage: previewError,
      handleEnded: previewHandleEnded,
      handleError: previewHandleError,
      pendingTrackId: () => 'pending-track',
      playingTrackId: () => 'playing-track',
      setAudioElement: previewSetAudio,
      togglePreview: previewToggle,
    }
  })
  componentMocks.button.mockImplementation((props: ButtonProps) => (
    <button disabled={props.disabled} onClick={() => void props.onPress()}>
      {props.children}
    </button>
  ))
  componentMocks.albumCard.mockImplementation((props: AlbumCardProps) => (
    <article data-testid={`album-${props.album.id}`}>
      <button onClick={() => props.onAddAlbum(props.album)}>add album {props.album.id}</button>
      <button onClick={() => props.onAddTrack(props.album.tracks[0] as PTrack)}>
        add track {props.album.id}
      </button>
      <button onClick={() => props.onPreview({id: 'preview-track', source: '/preview.mp3'})}>
        preview {props.album.id}
      </button>
    </article>
  ))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PAlbumLibraryContent', () => {
  it('should add, clear, restore, and preview albums across player membership states', async () => {
    const albums = [
      createAlbum('empty', []),
      createAlbum('included', [TRACK_ONE]),
      createAlbum('partial', [TRACK_ONE, TRACK_TWO]),
    ]
    audioMocks.loadBundledPAlbums.mockResolvedValue(albums)
    previewError = vi.fn(() => '미리듣기 오류')
    const [tracks, setTracks] = createSignal<readonly PTrack[]>([TRACK_ONE])
    const onAddTracks = vi.fn((nextTracks: readonly PTrack[]) => setTracks(nextTracks))
    const onPreviewEnd = vi.fn()
    const onPreviewStart = vi.fn()

    render(() => (
      <PAlbumLibraryContent
        onAddTracks={onAddTracks}
        onPreviewEnd={onPreviewEnd}
        onPreviewStart={onPreviewStart}
        tracks={tracks()}
      />
    ))

    expect(await screen.findByTestId('album-partial')).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent('미리듣기 오류')
    expect(vi.mocked(previewSetAudio).mock.calls[0]?.[0]).toBeInstanceOf(HTMLAudioElement)
    const cards = componentMocks.albumCard.mock.calls.map(([props]) => props as AlbumCardProps)
    expect(cards.map((props) => props.isInPlayer)).toEqual([false, true, false])
    expect(cards[2]?.index).toBe(2)
    expect(cards[2]?.pendingTrackId).toBe('pending-track')
    expect(cards[2]?.playingTrackId).toBe('playing-track')
    expect(cards[2]?.trackIds.has('track-one')).toBe(true)
    const audioElement = document.querySelector('audio')

    expect(audioElement).toBeInstanceOf(HTMLAudioElement)
    fireEvent.ended(audioElement as HTMLAudioElement)
    fireEvent.error(audioElement as HTMLAudioElement)
    expect(previewHandleEnded).toHaveBeenCalledOnce()
    expect(previewHandleError).toHaveBeenCalledOnce()
    previewOptions.onEnd()
    const stopPreview = vi.fn()
    previewOptions.onStart(stopPreview)
    expect(onPreviewEnd).toHaveBeenCalledOnce()
    expect(onPreviewStart).toHaveBeenCalledWith(stopPreview)

    screen.getByRole('button', {name: 'add album included'}).click()
    screen.getByRole('button', {name: 'add track partial'}).click()
    expect(onAddTracks).toHaveBeenCalledWith([TRACK_ONE])

    screen.getByRole('button', {name: 'preview included'}).click()
    expect(previewToggle).toHaveBeenCalledWith({id: 'preview-track', source: '/preview.mp3'})

    const previewFailure = new Error('preview rejected')
    vi.mocked(previewToggle).mockRejectedValueOnce(previewFailure)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    screen.getByRole('button', {name: 'preview partial'}).click()
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to toggle album track preview.',
        previewFailure,
      )
    })
  })

  it('should support optional preview callbacks', async () => {
    const firstView = render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)
    await waitFor(() => expect(audioMocks.loadBundledPAlbums).toHaveBeenCalled())

    previewOptions.onEnd()
    previewOptions.onStart(vi.fn())
    firstView.unmount()

    render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[TRACK_ONE]} />)
  })

  it('should report a loading failure and refetch when retry is pressed', async () => {
    const loadError = new Error('album load failed')
    const retryError = new Error('album retry failed')
    audioMocks.loadBundledPAlbums
      .mockRejectedValueOnce(loadError)
      .mockRejectedValueOnce(retryError)
      .mockResolvedValueOnce([createAlbum('recovered', [TRACK_ONE])])

    render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

    await screen.findByRole('button', {name: '다시 시도'})
    expect(reporterMocks.reportClientError).toHaveBeenCalledWith(loadError, {
      feature: 'album-library',
      source: 'error-boundary',
    })
    const retryProps = componentMocks.button.mock.lastCall?.[0] as ButtonProps
    await retryProps.onPress()

    expect(reporterMocks.reportClientError).toHaveBeenCalledWith(retryError, {
      feature: 'album-library',
      source: 'error-boundary',
    })
    const recoveredRetryProps = componentMocks.button.mock.lastCall?.[0] as ButtonProps
    await recoveredRetryProps.onPress()

    expect(audioMocks.loadBundledPAlbums).toHaveBeenCalledTimes(3)
    expect(await screen.findByTestId('album-recovered')).toBeTruthy()
  })

  it('should preserve bundled albums and retry only the failed published catalog', async () => {
    const catalogError = new Error('published catalog failed')
    const bundledAlbum = createAlbum('bundled', [TRACK_ONE])
    const publishedAlbum = createAlbum('published', [])
    audioMocks.loadBundledPAlbums.mockResolvedValue([bundledAlbum])
    audioMocks.loadPublishedPAlbums
      .mockResolvedValueOnce({error: catalogError, status: 'failed'})
      .mockResolvedValueOnce({albums: [publishedAlbum], status: 'ready'})

    render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

    expect(await screen.findByTestId('album-bundled')).toBeTruthy()
    expect(screen.getByRole('alert')).toHaveTextContent(
      '공개 앨범을 불러오지 못했어요. 기본 앨범은 계속 사용할 수 있어요.',
    )
    expect(reporterMocks.reportClientError).toHaveBeenCalledWith(catalogError, {
      feature: 'album-library',
      source: 'direct',
    })

    screen.getByRole('button', {name: '다시 시도'}).click()

    expect(await screen.findByTestId('album-published')).toBeTruthy()
    expect(audioMocks.loadBundledPAlbums).toHaveBeenCalledOnce()
    expect(audioMocks.loadPublishedPAlbums).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('should ignore a duplicate catalog retry while recovery is pending', async () => {
    const catalogError = new Error('published catalog failed')
    const catalogRequest = Promise.withResolvers<PPublishedAlbumCatalog>()
    audioMocks.loadPublishedPAlbums
      .mockResolvedValueOnce({error: catalogError, status: 'failed'})
      .mockReturnValueOnce(catalogRequest.promise)

    render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

    await screen.findByRole('alert')
    const retryProps = componentMocks.button.mock.lastCall?.[0] as ButtonProps
    const firstRetry = retryProps.onPress() as Promise<void>
    await retryProps.onPress()
    catalogRequest.resolve({albums: [], status: 'ready'})
    await firstRetry

    expect(audioMocks.loadPublishedPAlbums).toHaveBeenCalledTimes(2)
  })

  it('should recover through the full boundary when a catalog retry rejects unexpectedly', async () => {
    const catalogError = new Error('published catalog failed')
    const retryError = new Error('published catalog retry crashed')
    const bundledAlbum = createAlbum('bundled', [TRACK_ONE])
    const publishedAlbum = createAlbum('published', [])
    audioMocks.loadBundledPAlbums.mockResolvedValue([bundledAlbum])
    audioMocks.loadPublishedPAlbums
      .mockResolvedValueOnce({error: catalogError, status: 'failed'})
      .mockRejectedValueOnce(retryError)
      .mockResolvedValueOnce({albums: [publishedAlbum], status: 'ready'})

    render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

    await screen.findByRole('alert')
    screen.getByRole('button', {name: '다시 시도'}).click()
    await screen.findByText('앨범을 불러오지 못했어요')
    expect(reporterMocks.reportClientError).toHaveBeenCalledWith(retryError, {
      feature: 'album-library',
      source: 'error-boundary',
    })
    const retryProps = componentMocks.button.mock.lastCall?.[0] as ButtonProps
    await retryProps.onPress()

    expect(await screen.findByTestId('album-published')).toBeTruthy()
    expect(audioMocks.loadBundledPAlbums).toHaveBeenCalledTimes(2)
    expect(audioMocks.loadPublishedPAlbums).toHaveBeenCalledTimes(3)
  })

  it('should render bundled albums while the published catalog remains pending', async () => {
    const bundledAlbum = createAlbum('bundled', [TRACK_ONE])
    const catalogRequest = Promise.withResolvers<PPublishedAlbumCatalog>()
    audioMocks.loadBundledPAlbums.mockResolvedValue([bundledAlbum])
    audioMocks.loadPublishedPAlbums.mockReturnValue(catalogRequest.promise)

    render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

    expect(await screen.findByTestId('album-bundled')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()

    catalogRequest.resolve({albums: [], status: 'ready'})
  })
})
