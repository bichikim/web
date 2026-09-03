import {render} from '@solidjs/testing-library'
import {vi} from 'vitest'

import type {PSceneStyle} from '../../features/focus-room-animation'
import type {PTrack} from '../../features/focus-room-audio'
import type {PAlbumLibraryProps} from '../PAlbumLibrary'
import {MusicPlayerView} from '../MusicPlayerView'

vi.mock('media-chrome', () => ({}))

const albumLibraryMocks = vi.hoisted(() => ({
  addedTracks: [
    {
      artist: 'Album Artist',
      durationSeconds: 1,
      id: 'album-track',
      source: '/album-track.mp3',
      title: 'Album Track',
    },
  ] as const,
  stopPreview: vi.fn(),
}))

export const getAddedAlbumTracks = () => albumLibraryMocks.addedTracks
export const getStopAlbumPreview = () => albumLibraryMocks.stopPreview

vi.mock('../PAlbumLibrary', () => ({
  PAlbumLibrary: (props: PAlbumLibraryProps) => (
    <>
      <button
        aria-label="앨범 추가"
        data-player-utility="album"
        onClick={() => props.onAddTracks(albumLibraryMocks.addedTracks)}
        type="button"
      >
        <span
          aria-hidden="true"
          class={props.sceneStyle === 'scribble' ? 'i-pomo-scribble:album' : 'i-tabler-album'}
        />
      </button>
      <button data-testid="album-clear" onClick={() => props.onClearTracks?.()} type="button">
        재생목록 모두 비우기
      </button>
      <button
        data-testid="album-preview-start"
        onClick={() => props.onPreviewStart?.(albumLibraryMocks.stopPreview)}
        type="button"
      >
        미리듣기 시작
      </button>
      <button data-testid="album-preview-end" onClick={() => props.onPreviewEnd?.()} type="button">
        미리듣기 종료
      </button>
      <span data-testid="album-track-count">{props.tracks.length}</span>
    </>
  ),
}))

const TRACKS = [
  {
    artist: 'Artist',
    artworkUrl: '/audio/artwork/one.jpg',
    durationSeconds: 1,
    id: 'one',
    source: '/one.mp3',
    title: 'One',
  },
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

interface RenderMusicPlayerViewOptions {
  readonly currentTrack?: PTrack | null
  readonly expanded?: boolean
  readonly isPlaying?: boolean
  readonly levels?: readonly number[]
  readonly onAlbumAdd?: (tracks: readonly PTrack[]) => void
  readonly onAlbumClear?: () => void
  readonly onAudioElement?: (element: HTMLAudioElement) => void
  readonly onExpandedChange?: () => void
  readonly onNextTrack?: () => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly onPreviousTrack?: () => void
  readonly onRepeatModeChange?: (mode: 'repeat-all' | 'repeat-one') => void
  readonly onShuffleChange?: () => void
  readonly onTrackSelect?: (index: number) => void
  readonly sceneStyle?: PSceneStyle
}

export const renderMusicPlayerView = (options: RenderMusicPlayerViewOptions = {}) =>
  render(() => (
    <MusicPlayerView
      currentIndex={0}
      currentTrack={options.currentTrack === null ? undefined : (options.currentTrack ?? TRACKS[0])}
      expanded={options.expanded ?? true}
      isPlaying={options.isPlaying ?? false}
      levels={options.levels ?? []}
      onAudioElement={options.onAudioElement ?? vi.fn()}
      onAlbumAdd={options.onAlbumAdd}
      onAlbumClear={options.onAlbumClear}
      onExpandedChange={options.onExpandedChange ?? vi.fn()}
      onNextTrack={options.onNextTrack ?? vi.fn()}
      onPreviewEnd={options.onPreviewEnd}
      onPreviewStart={options.onPreviewStart}
      onPreviousTrack={options.onPreviousTrack ?? vi.fn()}
      onRepeatModeChange={options.onRepeatModeChange ?? vi.fn()}
      onShuffleChange={options.onShuffleChange ?? vi.fn()}
      onTrackSelect={options.onTrackSelect ?? vi.fn()}
      repeatMode="repeat-all"
      sceneStyle={options.sceneStyle ?? 'original'}
      shuffleEnabled={true}
      tracks={TRACKS}
    />
  ))

export const getProgressRanges = (container: HTMLElement) => {
  const collapsedRange = container.querySelector('.pomo-player__progress--collapsed')
  const expandedRange = container.querySelector('.pomo-player__progress--expanded')

  if (!(collapsedRange instanceof HTMLElement) || !(expandedRange instanceof HTMLElement)) {
    throw new TypeError('Expected both Pomo progress ranges to be rendered')
  }

  return {collapsedRange, expandedRange}
}
