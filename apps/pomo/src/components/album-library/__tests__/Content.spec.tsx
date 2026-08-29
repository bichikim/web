/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createResource, createSignal, type JSX} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PResolvedAlbum, PTrack, PTrackPreviewRequest} from '../../../features/focus-room-audio'

const audioMocks = vi.hoisted(() => ({loadPAlbums: vi.fn(), useTrackPreview: vi.fn()}))
const componentMocks = vi.hoisted(() => ({
  albumCard: vi.fn(),
  button: vi.fn(),
  footer: vi.fn(),
  modal: vi.fn(),
}))
const reporterMocks = vi.hoisted(() => ({reportClientError: vi.fn()}))

vi.mock('solid-js', async () => {
  const actual = await vi.importActual<typeof import('solid-js')>('solid-js')

  return {...actual, createResource: vi.fn(actual.createResource)}
})
vi.mock('../../../features/focus-room-audio', () => audioMocks)
vi.mock('../../../features/client-error-reporter', () => reporterMocks)
vi.mock('../../PModal', () => ({PModal: componentMocks.modal}))
vi.mock('../../PButton', () => ({PButton: componentMocks.button}))
vi.mock('../Card', () => ({AlbumCard: componentMocks.albumCard}))
vi.mock('../Footer', () => ({PlaylistFooter: componentMocks.footer}))

import PAlbumLibraryContent from '../Content'

interface ModalProps {
  readonly children: JSX.Element
  readonly description: string
  readonly footer: JSX.Element
  readonly isOpen: boolean
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly placement: string
  readonly size: string
  readonly title: string
}

interface ButtonProps {
  readonly children: JSX.Element
  readonly onPress: () => unknown
}

interface FooterProps {
  readonly canClear: boolean
  readonly clearedTrackCount: number
  readonly onClear: () => void
  readonly onRestore: () => void
  readonly trackCount: number
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
  componentMocks.modal.mockImplementation((props: ModalProps) => (
    <section
      data-description={props.description}
      data-is-open={String(props.isOpen)}
      data-placement={props.placement}
      data-size={props.size}
      data-title={props.title}
    >
      <button onClick={props.onCloseAutoFocus}>close autofocus</button>
      <button onClick={() => props.onOpenChange(false)}>change open</button>
      {props.children}
      {props.footer}
    </section>
  ))
  componentMocks.button.mockImplementation((props: ButtonProps) => (
    <button onClick={() => void props.onPress()}>{props.children}</button>
  ))
  componentMocks.footer.mockImplementation((props: FooterProps) => (
    <footer
      data-can-clear={String(props.canClear)}
      data-cleared-count={props.clearedTrackCount}
      data-track-count={props.trackCount}
    >
      <button onClick={props.onClear}>clear</button>
      <button onClick={props.onRestore}>restore</button>
    </footer>
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
    audioMocks.loadPAlbums.mockResolvedValue(albums)
    previewError = vi.fn(() => '미리듣기 오류')
    const [tracks, setTracks] = createSignal<readonly PTrack[]>([TRACK_ONE])
    const onAddTracks = vi.fn((nextTracks: readonly PTrack[]) => setTracks(nextTracks))
    const onClearTracks = vi.fn(() => setTracks([]))
    const onPreviewEnd = vi.fn()
    const onPreviewStart = vi.fn()

    render(() => (
      <PAlbumLibraryContent
        isOpen
        onAddTracks={onAddTracks}
        onClearTracks={onClearTracks}
        onCloseAutoFocus={vi.fn()}
        onOpenChange={vi.fn()}
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
    screen.getByRole('button', {name: 'change open'}).click()

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

    screen.getByRole('button', {name: 'clear'}).click()
    expect(onClearTracks).toHaveBeenCalledOnce()
    screen.getByRole('button', {name: 'restore'}).click()
    expect(onAddTracks).toHaveBeenCalledWith([TRACK_ONE])
    screen.getByRole('button', {name: 'restore'}).click()

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

  it('should ignore unavailable clear and restore actions and optional preview callbacks', async () => {
    audioMocks.loadPAlbums.mockResolvedValue([])
    const onClearTracks = vi.fn()
    const firstView = render(() => (
      <PAlbumLibraryContent
        isOpen
        onAddTracks={vi.fn()}
        onClearTracks={onClearTracks}
        onCloseAutoFocus={vi.fn()}
        onOpenChange={vi.fn()}
        tracks={[]}
      />
    ))
    await waitFor(() => expect(audioMocks.loadPAlbums).toHaveBeenCalled())

    screen.getByRole('button', {name: 'clear'}).click()
    screen.getByRole('button', {name: 'restore'}).click()
    previewOptions.onEnd()
    previewOptions.onStart(vi.fn())
    expect(onClearTracks).not.toHaveBeenCalled()
    firstView.unmount()

    render(() => (
      <PAlbumLibraryContent
        isOpen
        onAddTracks={vi.fn()}
        onCloseAutoFocus={vi.fn()}
        onOpenChange={vi.fn()}
        tracks={[TRACK_ONE]}
      />
    ))
    screen.getByRole('button', {name: 'clear'}).click()
  })

  it('should report a loading failure and refetch when retry is pressed', async () => {
    const loadError = new Error('album load failed')
    audioMocks.loadPAlbums
      .mockRejectedValueOnce(loadError)
      .mockResolvedValueOnce([createAlbum('recovered', [TRACK_ONE])])

    render(() => (
      <PAlbumLibraryContent
        isOpen
        onAddTracks={vi.fn()}
        onCloseAutoFocus={vi.fn()}
        onOpenChange={vi.fn()}
        tracks={[]}
      />
    ))

    await screen.findByRole('button', {name: '다시 시도'})
    expect(reporterMocks.reportClientError).toHaveBeenCalledWith(loadError, {
      feature: 'album-library',
      source: 'error-boundary',
    })
    const retryProps = componentMocks.button.mock.lastCall?.[0] as ButtonProps
    await retryProps.onPress()

    expect(audioMocks.loadPAlbums).toHaveBeenCalledTimes(2)
  })

  it('should tolerate a resource that becomes empty between the guard and list read', async () => {
    const album = createAlbum('transient', [TRACK_ONE])
    let reads = 0
    const resource = () => {
      reads += 1
      return reads === 1 ? [album] : null
    }
    vi.mocked(createResource).mockReturnValueOnce([resource, {refetch: vi.fn()}] as never)
    previewSetAudio = undefined as unknown as (element: HTMLAudioElement) => void

    render(() => (
      <PAlbumLibraryContent
        isOpen
        onAddTracks={vi.fn()}
        onCloseAutoFocus={vi.fn()}
        onOpenChange={vi.fn()}
        tracks={[]}
      />
    ))

    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2))
    expect(screen.queryByTestId('album-transient')).toBeNull()
  })
})
