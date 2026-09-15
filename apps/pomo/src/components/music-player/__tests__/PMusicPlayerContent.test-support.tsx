/** @vitest-environment jsdom */

import {cleanup} from '@solidjs/testing-library'
import {afterEach, beforeEach, vi} from 'vitest'

import type {
  ManualNavigationResolution,
  PPlaybackState,
  PTrack,
  ResolveManualNavigationOptions,
} from '../../../features/focus-room-audio'
import type {usePlayerController} from '../../media-player/use-player-controller'
import type {MusicPlayerViewProps} from '../../music-player-view/types'

type EventHandler = (value?: unknown) => void
const MOCK_AUDIO_LEVEL = 0.25

const eventMocks = vi.hoisted(() => ({
  handlers: new Map<string, EventHandler>(),
}))
const featureMocks = vi.hoisted(() => ({
  appendUniqueTracks: vi.fn(),
  applyPendingPosition: vi.fn(),
  createInitialPlaybackState: vi.fn(),
  createShuffleQueue: vi.fn(),
  loadPTrackQueueSource: vi.fn(),
  normalizeTrackIndex: vi.fn(),
  persistCurrentPlayback: vi.fn(),
  persistPlaybackError: vi.fn(),
  persistPlaybackIntent: vi.fn(),
  persistPlaybackProgress: vi.fn(),
  persistSeekedPlayback: vi.fn(),
  persistStoppedPlayback: vi.fn(),
  readPPlayback: vi.fn(),
  readPPlaylist: vi.fn(),
  resolveManualNavigation: vi.fn(),
  resolvePlaybackRestore: vi.fn(),
  resolvePPlaylist: vi.fn(),
  resolveTrackEnd: vi.fn(),
  resolveTrackRemoval: vi.fn(),
  setOutputGain: vi.fn(),
  setPendingPosition: vi.fn(),
  visualizerStart: vi.fn(),
  visualizerStop: vi.fn(),
  writePlayback: vi.fn(),
  writePPlaylist: vi.fn(),
}))
const viewMocks = vi.hoisted(() => ({capture: vi.fn()}))

const controllerMocks = vi.hoisted(() => ({capture: vi.fn()}))
vi.mock('../../media-player/use-player-controller', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../media-player/use-player-controller')>()
  return {
    usePlayerController: (props: Parameters<typeof original.usePlayerController>[0]) => {
      const player = original.usePlayerController(props)
      controllerMocks.capture(player)
      return player
    },
  }
})
const latestController = () =>
  controllerMocks.capture.mock.lastCall?.[0] as ReturnType<typeof usePlayerController>
export {latestController}
export const getFeatureMocks = () => featureMocks
vi.mock('media-chrome', () => ({}))

vi.mock('@winter-love/solid-use/event', () => ({
  useEvent: vi.fn((_target, event: string, handler: (value?: unknown) => void) => {
    eventMocks.handlers.set(event, handler)
  }),
}))
vi.mock('../../../features/focus-room-audio', () => ({
  appendUniqueTracks: featureMocks.appendUniqueTracks,
  createInitialPlaybackState: featureMocks.createInitialPlaybackState,
  createShuffleQueue: featureMocks.createShuffleQueue,
  loadPTrackQueueSource: featureMocks.loadPTrackQueueSource,
  normalizeTrackIndex: featureMocks.normalizeTrackIndex,
  readPPlayback: featureMocks.readPPlayback,
  readPPlaylist: featureMocks.readPPlaylist,
  resolveManualNavigation: featureMocks.resolveManualNavigation,
  resolvePlaybackRestore: featureMocks.resolvePlaybackRestore,
  resolvePPlaylist: featureMocks.resolvePPlaylist,
  resolveTrackEnd: featureMocks.resolveTrackEnd,
  resolveTrackRemoval: featureMocks.resolveTrackRemoval,
  usePAudioVisualizer: () => ({
    levels: () => [MOCK_AUDIO_LEVEL],
    setOutputGain: featureMocks.setOutputGain,
    start: featureMocks.visualizerStart,
    stop: featureMocks.visualizerStop,
  }),
  usePPlaybackPersistence: () => ({
    applyPendingPosition: featureMocks.applyPendingPosition,
    persistCurrentPlayback: featureMocks.persistCurrentPlayback,
    persistPlaybackError: featureMocks.persistPlaybackError,
    persistPlaybackIntent: featureMocks.persistPlaybackIntent,
    persistPlaybackProgress: featureMocks.persistPlaybackProgress,
    persistSeekedPlayback: featureMocks.persistSeekedPlayback,
    persistStoppedPlayback: featureMocks.persistStoppedPlayback,
    setPendingPosition: featureMocks.setPendingPosition,
    writePlayback: featureMocks.writePlayback,
  }),
  writePPlaylist: featureMocks.writePPlaylist,
}))
vi.mock('../../music-player-view/MusicPlayerView', () => ({
  MusicPlayerView: (props: MusicPlayerViewProps) => {
    viewMocks.capture(props)
    return <div data-testid="player-view" />
  },
}))

export const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
  {artist: 'Artist', durationSeconds: 1, id: 'three', source: '/three.mp3', title: 'Three'},
] as const satisfies readonly PTrack[]
export const ADDED_TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'added',
  source: '/added.mp3',
  title: 'Added',
} as const satisfies PTrack

export const latestViewProps = () => {
  const props = viewMocks.capture.mock.lastCall?.[0] as MusicPlayerViewProps | undefined

  if (props === undefined) {
    throw new Error('Expected MusicPlayerView props')
  }

  return props
}

export const emit = (event: string, value: unknown = new Event(event)) => {
  const controller = latestController()
  const entry = Object.entries({
    onEnded: controller.onEnded,
    onError: controller.onError,
    onLoadedMetadata: controller.onLoadedMetadata,
    onPause: controller.onPause,
    onPlay: controller.onPlay,
    onSeeked: controller.onSeeked,
    onSeeking: controller.onSeeking,
    onTimeUpdate: controller.onTimeUpdate,
  }).find(([name]) => name.slice(2).toLowerCase() === event)
  const handler = entry?.[1] ?? eventMocks.handlers.get(event)

  if (handler === undefined) {
    throw new Error(`Expected ${event} handler`)
  }

  if (typeof handler === 'function') {
    handler(value as never)
  }
}

export const createAudio = () => {
  const audio = document.querySelector('audio')
  if (audio === null) {
    throw new Error('Missing audio')
  }
  vi.spyOn(audio, 'load').mockImplementation(() => undefined)
  vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
  return audio
}

export const setAudioReadyState = (audio: HTMLAudioElement, readyState: number) => {
  Object.defineProperty(audio, 'readyState', {configurable: true, value: readyState})
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  eventMocks.handlers.clear()
  vi.clearAllMocks()
  featureMocks.createInitialPlaybackState.mockImplementation(
    ({trackCount}: {trackCount: number}) => ({
      currentIndex: trackCount > 1 ? 1 : 0,
      queue: trackCount > 1 ? [2, 0] : [],
    }),
  )
  featureMocks.createShuffleQueue.mockReturnValue([2, 0])
  featureMocks.resolveManualNavigation.mockImplementation(
    ({
      currentIndex,
      direction,
      repeatMode,
      shuffleEnabled,
      shuffleHistory,
      shuffleQueue,
      trackCount,
    }: ResolveManualNavigationOptions): ManualNavigationResolution => {
      if (trackCount < 1) {
        return {type: 'none'}
      }

      if (trackCount === 1 && direction === 'next' && repeatMode !== 'none') {
        return {type: 'restart'}
      }

      if (direction === 'previous' && shuffleEnabled) {
        const previousIndex = shuffleHistory.at(-1)
        if (previousIndex !== undefined) {
          return {
            index: previousIndex,
            shuffleHistory: shuffleHistory.slice(0, -1),
            shuffleQueue: [currentIndex, ...shuffleQueue],
            type: 'select',
          }
        }
      }

      if (direction === 'next' && shuffleEnabled) {
        const [nextIndex] = shuffleQueue
        if (nextIndex !== undefined) {
          return {
            index: nextIndex,
            shuffleHistory: [...shuffleHistory, currentIndex],
            shuffleQueue: shuffleQueue.slice(1),
            type: 'select',
          }
        }

        return repeatMode === 'none' ? {type: 'none'} : {type: 'reset-shuffle-queue'}
      }

      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
      if (nextIndex < 0 || nextIndex >= trackCount) {
        if (repeatMode === 'none') {
          return {type: 'none'}
        }

        return {
          index: (nextIndex + trackCount) % trackCount,
          shuffleHistory,
          shuffleQueue,
          type: 'select',
        }
      }

      return {
        index: nextIndex,
        shuffleHistory,
        shuffleQueue,
        type: 'select',
      }
    },
  )
  featureMocks.appendUniqueTracks.mockImplementation(
    (current: readonly PTrack[], added: readonly PTrack[]) =>
      added.length === 0 ? current : [...current, ...added],
  )
  featureMocks.resolvePlaybackRestore.mockImplementation(
    ({
      fallbackIndex,
      storedPlayback,
    }: {
      fallbackIndex: number
      storedPlayback: PPlaybackState | null
    }) => ({
      currentIndex: fallbackIndex,
      playback: storedPlayback,
      shouldPersist: false,
    }),
  )
  featureMocks.resolveTrackEnd.mockReturnValue('play-shuffled')
  featureMocks.resolveTrackRemoval.mockReturnValue({currentTrackChanged: true, nextCurrentIndex: 0})
  featureMocks.loadPTrackQueueSource.mockResolvedValue({
    defaultTracks: TRACKS,
    tracks: [...TRACKS, ADDED_TRACK],
  })
  featureMocks.readPPlaylist.mockResolvedValue(null)
  featureMocks.readPPlayback.mockResolvedValue(null)
  featureMocks.normalizeTrackIndex.mockImplementation((index: number, trackCount: number) => {
    if (trackCount < 1 || !Number.isInteger(trackCount) || !Number.isInteger(index)) {
      return undefined
    }
    const remainder = index % trackCount
    return remainder < 0 ? remainder + trackCount : remainder
  })
  featureMocks.resolvePPlaylist.mockImplementation(
    ({defaultTracks}: {readonly defaultTracks: readonly PTrack[]}) => defaultTracks,
  )
  featureMocks.writePPlaylist.mockResolvedValue(undefined)
  featureMocks.applyPendingPosition.mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
