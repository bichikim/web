/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../../../features/focus-room-audio'
import {
  ADDED_TRACK,
  createAudio,
  emit,
  getFeatureMocks,
  latestController,
  latestViewProps,
  setAudioReadyState,
  TRACKS,
} from './PMusicPlayerContent.test-support'
import {PMusicPlayerContent} from '../PMusicPlayerContent'

const featureMocks = getFeatureMocks()

describe('PMusicPlayerContent control paths', () => {
  it('should skip stored playlist loading for a controlled queue', () => {
    render(() => <PMusicPlayerContent onError={vi.fn()} tracks={TRACKS} />, {
      wrapper: PreferenceProvider,
    })

    expect(featureMocks.readPPlaylist).not.toHaveBeenCalled()
  })

  it('should cancel preview resume after a user pause', () => {
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
    const audio = createAudio()
    const firstStopPreview = vi.fn()
    const secondStopPreview = vi.fn()
    const controller = latestController()

    controller.onPlay()
    latestViewProps().onPreviewStart?.(firstStopPreview)
    controller.pause()
    controller.onPause()
    latestViewProps().onPreviewStart?.(secondStopPreview)
    latestViewProps().onPreviewEnd?.()

    expect(audio.play).not.toHaveBeenCalled()
  })

  it('should exercise preview, transport, shuffle, repeat, expansion, and playback controls', async () => {
    const onExpandedChange = vi.fn()
    const result = render(
      () => <PMusicPlayerContent onExpandedChange={onExpandedChange} tracks={TRACKS} />,
      {wrapper: PreferenceProvider},
    )
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

    latestController().pause()
    latestController().play()
    latestViewProps().onNextTrack()
    latestViewProps().onPreviousTrack()
    emit('pause')
    emit('seeking')
    emit('seeked')
    emit('timeupdate')
    emit('pagehide')
    result.unmount()
    expect(audio.pause).toHaveBeenCalled()
  })

  it('should dispatch every track-end action and reject an impossible action', () => {
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
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

  it('should wait for metadata before resuming the next track', async () => {
    featureMocks.resolveTrackEnd.mockReturnValue('play-next')
    featureMocks.applyPendingPosition.mockReturnValue({
      isPlaying: true,
      positionSeconds: 0,
      trackId: TRACKS[2].id,
    })
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
    const audio = createAudio()
    setAudioReadyState(audio, HTMLMediaElement.HAVE_NOTHING)

    emit('play')
    emit('ended')
    expect(latestViewProps().isPlaying).toBe(true)
    expect(latestViewProps().isPreparing).toBe(true)
    await Promise.resolve()
    expect(audio.load).toHaveBeenCalledOnce()
    expect(audio.play).not.toHaveBeenCalled()

    setAudioReadyState(audio, HTMLMediaElement.HAVE_METADATA)
    emit('loadedmetadata')
    expect(audio.play).toHaveBeenCalledOnce()
    expect(latestViewProps().isPlaying).toBe(true)
    expect(latestViewProps().isPreparing).toBe(true)

    emit('play')
    expect(latestViewProps().isPlaying).toBe(true)
    expect(latestViewProps().isPreparing).toBe(false)
  })

  it('should clear next-track preparation when the user pauses before metadata loads', async () => {
    featureMocks.resolveTrackEnd.mockReturnValue('play-next')
    featureMocks.applyPendingPosition.mockReturnValue({
      isPlaying: true,
      positionSeconds: 0,
      trackId: TRACKS[2].id,
    })
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
    const audio = createAudio()
    setAudioReadyState(audio, HTMLMediaElement.HAVE_NOTHING)

    emit('play')
    emit('ended')
    await Promise.resolve()

    expect(latestViewProps().isPlaying).toBe(true)
    expect(latestViewProps().isPreparing).toBe(true)

    latestController().pause()

    expect(latestViewProps().isPlaying).toBe(false)
    expect(latestViewProps().isPreparing).toBe(false)
    expect(audio.pause).toHaveBeenCalled()
  })

  it('should clear next-track preparation when a controlled queue becomes empty', async () => {
    const [tracks, setTracks] = createSignal<readonly PTrack[]>(TRACKS)
    render(() => <PMusicPlayerContent tracks={tracks()} />, {wrapper: PreferenceProvider})

    emit('play')
    latestViewProps().onNextTrack()
    expect(latestViewProps().isPreparing).toBe(true)

    setTracks([])
    await Promise.resolve()

    expect(latestViewProps().isPreparing).toBe(false)
  })

  it('should handle empty and single-track transport before metadata loads', () => {
    const empty = render(() => <PMusicPlayerContent tracks={[]} />, {wrapper: PreferenceProvider})
    latestViewProps().onTrackSelect(0)
    latestViewProps().onNextTrack()
    const emptyAudio = createAudio()
    latestViewProps().onNextTrack()
    featureMocks.resolveTrackEnd.mockReturnValueOnce('restart-current')
    emit('ended')
    expect(emptyAudio.play).toHaveBeenCalled()
    empty.unmount()

    render(() => <PMusicPlayerContent tracks={[TRACKS[0]]} />, {wrapper: PreferenceProvider})
    const audio = createAudio()
    latestViewProps().onNextTrack()
    featureMocks.resolveTrackEnd.mockReturnValueOnce('play-shuffled')
    emit('ended')
    expect(audio.play).toHaveBeenCalled()
  })

  it('should expose playlist preparation only while the uncontrolled source loads', async () => {
    const source = Promise.withResolvers<{
      readonly defaultTracks: readonly PTrack[]
      readonly tracks: readonly PTrack[]
    }>()
    featureMocks.loadPTrackQueueSource.mockReturnValueOnce(source.promise)

    render(() => <PMusicPlayerContent />, {wrapper: PreferenceProvider})

    expect(latestViewProps().isPlaylistLoading).toBe(true)

    source.resolve({defaultTracks: TRACKS, tracks: TRACKS})
    await Promise.resolve()
    await Promise.resolve()

    expect(latestViewProps().isPlaylistLoading).toBe(false)

    cleanup()
    render(() => <PMusicPlayerContent tracks={[]} />, {wrapper: PreferenceProvider})

    expect(latestViewProps().isPlaylistLoading).toBe(false)
  })

  it('should keep playlist preparation visible when stored queue loading fails first', async () => {
    const source = Promise.withResolvers<{
      readonly defaultTracks: readonly PTrack[]
      readonly tracks: readonly PTrack[]
    }>()
    const storageFailure = new Error('Stored playlist unavailable')
    featureMocks.loadPTrackQueueSource.mockReturnValueOnce(source.promise)
    featureMocks.readPPlaylist.mockRejectedValueOnce(storageFailure)
    const onError = vi.fn()

    render(() => <PMusicPlayerContent onError={onError} />, {wrapper: PreferenceProvider})
    await Promise.resolve()

    expect(latestViewProps().isPlaylistLoading).toBe(true)
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(storageFailure))

    source.resolve({defaultTracks: TRACKS, tracks: TRACKS})
    await Promise.resolve()
    await Promise.resolve()

    expect(latestViewProps().isPlaylistLoading).toBe(false)
  })

  it('should ignore abort errors, current errors after cleanup, and obsolete play failures', async () => {
    featureMocks.applyPendingPosition.mockReturnValue({
      isPlaying: true,
      positionSeconds: 0,
      trackId: 'one',
    })
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />, {
      wrapper: PreferenceProvider,
    })
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
    const first = render(() => <PMusicPlayerContent tracks={TRACKS} />, {
      wrapper: PreferenceProvider,
    })
    await Promise.resolve()
    await Promise.resolve()
    first.unmount()
    expect(featureMocks.writePlayback).not.toHaveBeenCalled()

    featureMocks.resolvePlaybackRestore.mockReturnValueOnce({
      currentIndex: 0,
      playback: storedPlayback,
      shouldPersist: true,
    })
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
    await Promise.resolve()
    await Promise.resolve()
    expect(featureMocks.writePlayback).toHaveBeenCalledWith(storedPlayback)
  })

  it('should handle transport branches with no audio, no resume, and empty shuffle queues', async () => {
    featureMocks.createInitialPlaybackState.mockReturnValueOnce({currentIndex: 0, queue: []})
    featureMocks.createShuffleQueue.mockReturnValue([])
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
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
    latestViewProps().onPreviousTrack()
  })

  it('should suppress denied manual transport commands without controller side effects', () => {
    featureMocks.resolveManualNavigation.mockReturnValue({type: 'none'})
    render(() => <PMusicPlayerContent tracks={TRACKS} />, {wrapper: PreferenceProvider})
    const audio = createAudio()
    expect(latestViewProps().canNavigateNextTrack).toBe(false)
    expect(latestViewProps().canNavigatePreviousTrack).toBe(false)
    emit('play')
    const initialIndex = latestController().currentIndex()
    const writeCount = featureMocks.writePlayback.mock.calls.length
    const pendingCount = featureMocks.setPendingPosition.mock.calls.length
    const loadCount = vi.mocked(audio.load).mock.calls.length
    const pauseCount = vi.mocked(audio.pause).mock.calls.length
    const playCount = vi.mocked(audio.play).mock.calls.length

    latestViewProps().onNextTrack()
    latestViewProps().onPreviousTrack()

    expect(latestController().currentIndex()).toBe(initialIndex)
    expect(featureMocks.writePlayback).toHaveBeenCalledTimes(writeCount)
    expect(featureMocks.setPendingPosition).toHaveBeenCalledTimes(pendingCount)
    expect(audio.load).toHaveBeenCalledTimes(loadCount)
    expect(audio.pause).toHaveBeenCalledTimes(pauseCount)
    expect(audio.play).toHaveBeenCalledTimes(playCount)
  })
})
