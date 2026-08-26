/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../../../features/focus-room-audio'
import type {MusicPlayerViewProps} from '../../music-player-view/shared'
import PMusicPlayerContent from '../Content'

type EventHandler = (value?: unknown) => void

const eventMocks = vi.hoisted(() => ({
  handlers: new Map<string, EventHandler>(),
}))
const featureMocks = vi.hoisted(() => ({
  appendUniqueTracks: vi.fn(),
  applyPendingPosition: vi.fn(),
  createInitialPlaybackState: vi.fn(),
  createShuffleQueue: vi.fn(),
  loadPTracks: vi.fn(),
  mediaSessionOptions: vi.fn(),
  persistCurrentPlayback: vi.fn(),
  persistPlaybackProgress: vi.fn(),
  readPPlayback: vi.fn(),
  resolvePlaybackRestore: vi.fn(),
  resolveTrackEnd: vi.fn(),
  resolveTrackRemoval: vi.fn(),
  setPendingPosition: vi.fn(),
  visualizerStart: vi.fn(),
  visualizerStop: vi.fn(),
  writePlayback: vi.fn(),
}))
const viewMocks = vi.hoisted(() => ({capture: vi.fn()}))

vi.mock('@winter-love/solid-use/event', () => ({
  useEvent: vi.fn((_target, event: string, handler: (value?: unknown) => void) => {
    eventMocks.handlers.set(event, handler)
  }),
}))
vi.mock('../../../features/focus-room-audio', () => ({
  appendUniqueTracks: featureMocks.appendUniqueTracks,
  createInitialPlaybackState: featureMocks.createInitialPlaybackState,
  createShuffleQueue: featureMocks.createShuffleQueue,
  loadPTracks: featureMocks.loadPTracks,
  readPPlayback: featureMocks.readPPlayback,
  resolvePlaybackRestore: featureMocks.resolvePlaybackRestore,
  resolveTrackEnd: featureMocks.resolveTrackEnd,
  resolveTrackRemoval: featureMocks.resolveTrackRemoval,
  usePAudioVisualizer: () => ({
    levels: () => [0.25],
    start: featureMocks.visualizerStart,
    stop: featureMocks.visualizerStop,
  }),
  usePlayerMediaSession: featureMocks.mediaSessionOptions,
  usePPlaybackPersistence: () => ({
    applyPendingPosition: featureMocks.applyPendingPosition,
    persistCurrentPlayback: featureMocks.persistCurrentPlayback,
    persistPlaybackProgress: featureMocks.persistPlaybackProgress,
    setPendingPosition: featureMocks.setPendingPosition,
    writePlayback: featureMocks.writePlayback,
  }),
}))
vi.mock('../../MusicPlayerView', () => ({
  MusicPlayerView: (props: MusicPlayerViewProps) => {
    viewMocks.capture(props)
    return <div data-testid="player-view" />
  },
}))

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
  {artist: 'Artist', durationSeconds: 1, id: 'three', source: '/three.mp3', title: 'Three'},
] as const satisfies readonly PTrack[]
const ADDED_TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'added',
  source: '/added.mp3',
  title: 'Added',
} as const satisfies PTrack

const latestViewProps = () => {
  const props = viewMocks.capture.mock.lastCall?.[0] as MusicPlayerViewProps | undefined

  if (props === undefined) {
    throw new Error('Expected MusicPlayerView props')
  }

  return props
}

const emit = (event: string, value: unknown = new Event(event)) => {
  const handler = eventMocks.handlers.get(event)

  if (handler === undefined) {
    throw new Error(`Expected ${event} handler`)
  }

  handler(value)
}

const createAudio = () => {
  const audio = document.createElement('audio')
  vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  latestViewProps().onAudioElement(audio)
  return audio
}

beforeEach(() => {
  eventMocks.handlers.clear()
  vi.clearAllMocks()
  featureMocks.createInitialPlaybackState.mockImplementation(
    ({trackCount}: {trackCount: number}) => ({
      currentIndex: trackCount > 1 ? 1 : 0,
      queue: trackCount > 1 ? [2, 0] : [],
    }),
  )
  featureMocks.createShuffleQueue.mockReturnValue([2, 0])
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
  featureMocks.loadPTracks.mockResolvedValue(TRACKS)
  featureMocks.readPPlayback.mockResolvedValue(null)
  featureMocks.applyPendingPosition.mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PMusicPlayerContent control paths', () => {
  it('should exercise preview, transport, shuffle, repeat, expansion, and media-session controls', async () => {
    const onExpandedChange = vi.fn()
    const result = render(() => (
      <PMusicPlayerContent onExpandedChange={onExpandedChange} tracks={TRACKS} />
    ))
    const audio = createAudio()
    const firstStop = vi.fn()
    const secondStop = vi.fn()

    latestViewProps().onPreviewEnd?.()
    latestViewProps().onPreviewStart?.(firstStop)
    latestViewProps().onPreviewStart?.(secondStop)
    expect(firstStop).toHaveBeenCalledOnce()

    emit('play')
    latestViewProps().onPreviewStart?.(secondStop)
    latestViewProps().onPreviewEnd?.()
    await Promise.resolve()
    expect(audio.play).toHaveBeenCalled()

    latestViewProps().onRepeatModeChange('repeat-all')
    latestViewProps().onRepeatModeChange('repeat-all')
    latestViewProps().onShuffleChange()
    latestViewProps().onNextTrack()
    latestViewProps().onPreviousTrack()
    latestViewProps().onTrackSelect(2)
    latestViewProps().onShuffleChange()
    latestViewProps().onTrackSelect(1)
    latestViewProps().onExpandedChange()
    expect(onExpandedChange).toHaveBeenCalledWith(true)

    const mediaOptions = featureMocks.mediaSessionOptions.mock.lastCall?.[0]
    mediaOptions.onPause()
    mediaOptions.onPlay()
    mediaOptions.onNextTrack()
    mediaOptions.onPreviousTrack()
    emit('pause')
    emit('seeking')
    emit('seeked')
    emit('timeupdate')
    emit('pagehide')
    result.unmount()
    expect(audio.pause).toHaveBeenCalled()
  })

  it('should dispatch every track-end action and reject an impossible action', () => {
    render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = createAudio()

    for (const action of [
      'play-first',
      'play-next',
      'play-shuffled',
      'restart-current',
      'restart-shuffle',
      'stop',
    ] as const) {
      featureMocks.resolveTrackEnd.mockReturnValueOnce(action)
      emit('ended')
    }

    featureMocks.resolveTrackEnd.mockReturnValueOnce('impossible')
    expect(() => emit('ended')).toThrow('Unsupported track end action: impossible')
    expect(audio.play).toHaveBeenCalled()
  })

  it('should handle empty and single-track transport without an audio element', () => {
    const empty = render(() => <PMusicPlayerContent tracks={[]} />)
    latestViewProps().onTrackSelect(0)
    latestViewProps().onNextTrack()
    const emptyAudio = createAudio()
    latestViewProps().onNextTrack()
    featureMocks.resolveTrackEnd.mockReturnValueOnce('restart-current')
    emit('ended')
    expect(emptyAudio.play).toHaveBeenCalled()
    empty.unmount()

    render(() => <PMusicPlayerContent tracks={[TRACKS[0]]} />)
    const audio = createAudio()
    latestViewProps().onNextTrack()
    featureMocks.resolveTrackEnd.mockReturnValueOnce('play-shuffled')
    emit('ended')
    expect(audio.play).toHaveBeenCalled()
  })

  it('should ignore abort errors, current errors after cleanup, and obsolete play failures', async () => {
    featureMocks.applyPendingPosition.mockReturnValue({
      isPlaying: true,
      positionSeconds: 0,
      trackId: 'one',
    })
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = createAudio()

    emit('error', new DOMException('aborted', 'AbortError'))
    vi.mocked(audio.play).mockRejectedValueOnce(new Error('obsolete'))
    emit('loadedmetadata')
    emit('play')
    await Promise.resolve()
    result.unmount()
    emit('error', new Error('after cleanup'))
    emit('loadedmetadata')
    expect(featureMocks.visualizerStop).not.toHaveBeenCalled()
  })

  it('should persist a required restoration and skip a null restoration', async () => {
    const storedPlayback = {
      isPlaying: false,
      positionSeconds: 4,
      trackId: 'one',
    } satisfies PPlaybackState
    featureMocks.readPPlayback.mockResolvedValue(storedPlayback)
    featureMocks.resolvePlaybackRestore.mockReturnValueOnce({
      currentIndex: 0,
      playback: null,
      shouldPersist: true,
    })
    const first = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    await Promise.resolve()
    await Promise.resolve()
    first.unmount()
    expect(featureMocks.writePlayback).not.toHaveBeenCalled()

    featureMocks.resolvePlaybackRestore.mockReturnValueOnce({
      currentIndex: 0,
      playback: storedPlayback,
      shouldPersist: true,
    })
    render(() => <PMusicPlayerContent tracks={TRACKS} />)
    await Promise.resolve()
    await Promise.resolve()
    expect(featureMocks.writePlayback).toHaveBeenCalledWith(storedPlayback)
  })

  it('should handle transport branches with no audio, no resume, and empty shuffle queues', async () => {
    featureMocks.createInitialPlaybackState.mockReturnValueOnce({currentIndex: 0, queue: []})
    featureMocks.createShuffleQueue.mockReturnValue([])
    render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const stopPreview = vi.fn()

    latestViewProps().onPreviewStart?.(stopPreview)
    latestViewProps().onPreviewEnd?.()
    emit('play')
    latestViewProps().onNextTrack()
    featureMocks.resolveTrackEnd.mockReturnValueOnce('play-shuffled')
    emit('ended')
    await Promise.resolve()

    featureMocks.createShuffleQueue.mockReturnValue([2])
    latestViewProps().onShuffleChange()
    latestViewProps().onShuffleChange()
    latestViewProps().onNextTrack()
    const pop = vi.spyOn(Array.prototype, 'pop').mockReturnValueOnce(undefined)
    latestViewProps().onPreviousTrack()
    pop.mockRestore()
  })

  it('should reject invalid queue edits and handle unchanged and empty removals', async () => {
    let resolveTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTracks.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = resolve
        }),
    )
    const result = render(() => <PMusicPlayerContent />)
    const audio = createAudio()

    latestViewProps().onAlbumAdd?.([])
    featureMocks.appendUniqueTracks.mockImplementationOnce((current) => current)
    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    latestViewProps().onAlbumAdd?.(TRACKS)
    latestViewProps().onTrackRemove?.(Number.NaN)
    latestViewProps().onTrackRemove?.(-1)
    latestViewProps().onTrackRemove?.(99)
    featureMocks.resolveTrackRemoval.mockReturnValueOnce({
      currentTrackChanged: false,
      nextCurrentIndex: 0,
    })
    latestViewProps().onTrackRemove?.(2)
    expect(featureMocks.setPendingPosition).not.toHaveBeenCalledWith(null)

    result.unmount()
    resolveTracks?.(TRACKS)
    await Promise.resolve()
    await Promise.resolve()
    expect(audio.pause).toHaveBeenCalled()

    featureMocks.loadPTracks.mockImplementationOnce(
      () =>
        new Promise(() => {
          // Intentionally pending to keep the playlist unresolved.
        }),
    )
    render(() => <PMusicPlayerContent />)
    const emptyAudio = createAudio()
    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    latestViewProps().onTrackRemove?.(0)
    expect(featureMocks.setPendingPosition).toHaveBeenCalledWith(null)
    expect(emptyAudio.pause).toHaveBeenCalled()
  })

  it('should clear before initial loading and merge a concurrently added active track', async () => {
    let resolveClearedTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTracks.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveClearedTracks = resolve
        }),
    )
    const cleared = render(() => <PMusicPlayerContent />)
    latestViewProps().onAlbumClear?.()
    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    latestViewProps().onAlbumClear?.()
    resolveClearedTracks?.(TRACKS)
    await Promise.resolve()
    await Promise.resolve()
    cleared.unmount()

    let resolveMergedTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTracks.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMergedTracks = resolve
        }),
    )
    render(() => <PMusicPlayerContent />)
    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    resolveMergedTracks?.(TRACKS)
    await Promise.resolve()
    await Promise.resolve()
    expect(featureMocks.createShuffleQueue).toHaveBeenCalledWith({
      currentIndex: 3,
      trackCount: 4,
    })
  })

  it('should ignore a playlist completed after cleanup and handle playlist rejection', async () => {
    let resolveTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTracks.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = resolve
        }),
    )
    const result = render(() => <PMusicPlayerContent />)
    result.unmount()
    resolveTracks?.(TRACKS)
    await Promise.resolve()
    await Promise.resolve()

    featureMocks.loadPTracks.mockRejectedValueOnce(new Error('playlist failed'))
    render(() => <PMusicPlayerContent />)
    await Promise.resolve()
    await Promise.resolve()
    expect(featureMocks.visualizerStop).toHaveBeenCalled()
  })

  it('should restore stored playback after an uncontrolled playlist resolves', async () => {
    const storedPlayback = {
      isPlaying: false,
      positionSeconds: 7,
      trackId: 'two',
    } satisfies PPlaybackState
    featureMocks.readPPlayback.mockResolvedValue(storedPlayback)
    render(() => <PMusicPlayerContent />)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(featureMocks.resolvePlaybackRestore).toHaveBeenCalledWith(
      expect.objectContaining({storedPlayback}),
    )
  })
})
