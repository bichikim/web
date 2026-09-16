/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../../../features/focus-room-audio'
import {
  ADDED_TRACK,
  createAudio,
  emit,
  getFeatureMocks,
  latestController,
  latestViewProps,
  TRACKS,
} from './PMusicPlayerContent.test-support'
import {PMusicPlayerContent} from '../PMusicPlayerContent'

const featureMocks = getFeatureMocks()

describe('PMusicPlayerContent queue and restoration paths', () => {
  it('should reject invalid queue edits and handle unchanged and empty removals', async () => {
    let resolveTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = (tracks) => resolve({defaultTracks: tracks, tracks})
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

    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
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

  it('should report playlist storage write failures without stopping playback', async () => {
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise(() => {
          // Intentionally pending to isolate the queue edit.
        }),
    )
    const failure = new Error('Storage is unavailable')
    const onError = vi.fn()
    featureMocks.writePPlaylist.mockRejectedValueOnce(failure)
    render(() => <PMusicPlayerContent onError={onError} />)
    emit('play')

    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    await Promise.resolve()

    expect(featureMocks.writePPlaylist).toHaveBeenCalledWith([ADDED_TRACK.id])
    expect(onError).toHaveBeenCalledWith(failure)
    expect(latestViewProps().isPlaying).toBe(true)
  })

  it('should keep pending playback when removing a non-current track', () => {
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise(() => {
          // Intentionally pending to isolate the queue edit.
        }),
    )
    render(() => <PMusicPlayerContent />)
    const audio = createAudio()

    latestViewProps().onAlbumAdd?.([ADDED_TRACK, TRACKS[0], TRACKS[1]])
    latestController().play()
    vi.mocked(audio.pause).mockClear()
    featureMocks.resolveTrackRemoval.mockReturnValueOnce({
      currentTrackChanged: false,
      nextCurrentIndex: 0,
    })
    latestViewProps().onTrackRemove?.(1)

    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('should clear before initial loading and merge a concurrently added active track', async () => {
    let resolveClearedTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveClearedTracks = (tracks) => resolve({defaultTracks: tracks, tracks})
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
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMergedTracks = (tracks) => resolve({defaultTracks: tracks, tracks})
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
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = (tracks) => resolve({defaultTracks: tracks, tracks})
        }),
    )
    const result = render(() => <PMusicPlayerContent />)
    result.unmount()
    resolveTracks?.(TRACKS)
    await Promise.resolve()
    await Promise.resolve()

    featureMocks.loadPTrackQueueSource.mockRejectedValueOnce(new Error('playlist failed'))
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

  it('should apply stored playback once after playlist storage resolves', async () => {
    const storedPlayback = {
      isPlaying: false,
      positionSeconds: 7,
      trackId: 'two',
    } satisfies PPlaybackState
    featureMocks.readPPlayback.mockResolvedValue(storedPlayback)
    const playlist = Promise.withResolvers<readonly string[] | null>()
    const restoredTracks = TRACKS.filter((track) => track.id === storedPlayback.trackId)
    featureMocks.readPPlaylist.mockReturnValue(playlist.promise)
    featureMocks.resolvePPlaylist.mockReturnValue(restoredTracks)

    render(() => <PMusicPlayerContent />)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(featureMocks.resolvePlaybackRestore).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({storedPlayback: null, tracks: TRACKS}),
    )

    playlist.resolve([storedPlayback.trackId])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(featureMocks.resolvePlaybackRestore).toHaveBeenCalledTimes(2)
    expect(featureMocks.resolvePlaybackRestore).toHaveBeenLastCalledWith(
      expect.objectContaining({storedPlayback, tracks: restoredTracks}),
    )
  })

  it('should restore stored playback after a queue edit during initial loading', async () => {
    const storedPlayback = {
      isPlaying: true,
      positionSeconds: 42,
      trackId: 'two',
    } satisfies PPlaybackState
    featureMocks.readPPlayback.mockResolvedValue(storedPlayback)
    let resolveTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = (tracks) => resolve({defaultTracks: tracks, tracks})
        }),
    )
    featureMocks.resolvePlaybackRestore.mockImplementationOnce(
      ({
        storedPlayback,
        tracks,
      }: {
        readonly storedPlayback: PPlaybackState
        readonly tracks: readonly PTrack[]
      }) => ({
        currentIndex: tracks.findIndex((track) => track.id === storedPlayback.trackId),
        playback: storedPlayback,
        shouldPersist: false,
      }),
    )

    render(() => <PMusicPlayerContent />)
    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    resolveTracks?.(TRACKS)
    await vi.waitFor(() =>
      expect(featureMocks.resolvePlaybackRestore).toHaveBeenLastCalledWith(
        expect.objectContaining({
          storedPlayback,
          tracks: [...TRACKS, ADDED_TRACK],
        }),
      ),
    )
    expect(latestViewProps().currentTrack).toBe(TRACKS[1])
    expect(latestViewProps().tracks).toEqual([...TRACKS, ADDED_TRACK])
  })

  it('should preserve initial queue edits while the saved playlist is pending', async () => {
    const storedPlayback = {
      isPlaying: true,
      positionSeconds: 42,
      trackId: 'two',
    } satisfies PPlaybackState
    featureMocks.readPPlayback.mockResolvedValue(storedPlayback)
    const playlist = Promise.withResolvers<readonly string[] | null>()
    featureMocks.readPPlaylist.mockReturnValue(playlist.promise)
    let resolveTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = (tracks) =>
            resolve({defaultTracks: tracks, tracks: [...tracks, ADDED_TRACK]})
        }),
    )
    featureMocks.resolvePlaybackRestore.mockImplementationOnce(
      ({
        storedPlayback,
        tracks,
      }: {
        readonly storedPlayback: PPlaybackState
        readonly tracks: readonly PTrack[]
      }) => ({
        currentIndex: tracks.findIndex((track) => track.id === storedPlayback.trackId),
        playback: storedPlayback,
        shouldPersist: false,
      }),
    )

    render(() => <PMusicPlayerContent />)
    latestViewProps().onAlbumAdd?.([ADDED_TRACK])
    resolveTracks?.(TRACKS)
    await vi.waitFor(() => expect(latestViewProps().tracks).toEqual([...TRACKS, ADDED_TRACK]))
    expect(featureMocks.resolvePPlaylist).not.toHaveBeenCalled()
    expect(latestViewProps().currentTrack).toBe(TRACKS[1])

    playlist.resolve([storedPlayback.trackId])
    await Promise.resolve()
    expect(latestViewProps().tracks).toEqual([...TRACKS, ADDED_TRACK])
  })

  it('should restore playback after removing a non-current track during initial loading', async () => {
    const storedPlayback = {
      isPlaying: true,
      positionSeconds: 42,
      trackId: 'two',
    } satisfies PPlaybackState
    featureMocks.readPPlayback.mockResolvedValue(storedPlayback)
    let resolveTracks: ((tracks: readonly PTrack[]) => void) | undefined
    featureMocks.loadPTrackQueueSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTracks = (tracks) => resolve({defaultTracks: tracks, tracks})
        }),
    )
    featureMocks.resolvePlaybackRestore.mockImplementationOnce(
      ({
        storedPlayback,
        tracks,
      }: {
        readonly storedPlayback: PPlaybackState
        readonly tracks: readonly PTrack[]
      }) => ({
        currentIndex: tracks.findIndex((track) => track.id === storedPlayback.trackId),
        playback: storedPlayback,
        shouldPersist: false,
      }),
    )

    render(() => <PMusicPlayerContent />)
    latestViewProps().onAlbumAdd?.([ADDED_TRACK, TRACKS[0]])
    featureMocks.resolveTrackRemoval.mockReturnValueOnce({
      currentTrackChanged: false,
      nextCurrentIndex: 0,
    })
    latestViewProps().onTrackRemove?.(1)
    resolveTracks?.(TRACKS)
    await vi.waitFor(() =>
      expect(latestViewProps().tracks).toEqual([TRACKS[1], TRACKS[2], ADDED_TRACK]),
    )
    expect(latestViewProps().currentTrack).toBe(TRACKS[1])
  })
})
