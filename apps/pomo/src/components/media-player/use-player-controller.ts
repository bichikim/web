import {type Preference, usePreference} from 'src/hooks/use-preference'
import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {clamp} from 'es-toolkit/math'

import {
  createInitialPlaybackState,
  createShuffleQueue,
  normalizeTrackIndex,
  playlistPreference,
  type PlaylistPreference,
  type PTrack,
  stopPPlayback,
  usePAudioVisualizer,
  usePPlaybackPersistence,
} from '../../features/focus-room-audio'
import {usePlayerVolumeDucking} from '../../features/focus-room-dialogue'
import type {MediaPlayerOptions, PlayerState, SelectTrackOptions} from './types'
import {createPlayerQueueController} from './create-player-queue-controller'
import {type Playback, usePlayback} from './use-playback'
import {usePlaylistRestoration} from './use-playlist-restoration'
import {usePlaybackOrder} from './use-playback-order'
import {createPreviewPlayback} from './preview-playback'
import {
  getCurrentPlaybackTransition,
  persistRestoredPlayback,
  type PlaybackTransition,
  readPlaybackPosition,
} from './playback-transition'

export interface UsePlayerControllerProps extends MediaPlayerOptions {
  readonly element: Accessor<HTMLAudioElement | undefined>
}

export interface PlayerController extends PlayerState {
  readonly invalidate: Playback['invalidate']
  readonly markPauseIntent: Playback['markPauseIntent']
  readonly onEnded: () => void
  readonly onError: Playback['onError']
  readonly onLoadedMetadata: () => void
  readonly onPause: Playback['onPause']
  readonly onPlay: Playback['onPlay']
  readonly onSeeked: () => void
  readonly onSeeking: () => void
  readonly onTimeUpdate: () => void
  readonly pause: Playback['pause']
  readonly play: Playback['play']
  readonly seek: Playback['seek']
  readonly stop: Playback['stop']
}

const clampTrackIndex = (index: number, trackCount: number) =>
  clamp(index, 0, Math.max(trackCount - 1, 0))

/** 음악 목록, 곡 선택·반복·셔플 정책, 저장된 재생 위치 복원과 미리듣기를 조율한다. */
// oxlint-disable-next-line eslint/max-lines-per-function, eslint/max-statements -- Transport, persistence, and lifecycle callbacks remain coordinated here; playlist queue mutations are extracted to create-player-queue-controller.
export const usePlayerController = (props: UsePlayerControllerProps): PlayerController => {
  const initialTracks = untrack(() => props.tracks ?? [])
  const initialState = createInitialPlaybackState({trackCount: initialTracks.length})
  const [loadedTracks, setLoadedTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const [isPlaylistLoading, setIsPlaylistLoading] = createSignal(props.tracks === undefined)
  const [isPreparing, setIsPreparing] = createSignal(false)
  const tracks = () => props.tracks ?? loadedTracks()
  const [currentIndexValue, setCurrentIndex] = createSignal(initialState.currentIndex)
  const currentIndex = createMemo(() => clampTrackIndex(currentIndexValue(), tracks().length))
  const visualizer = usePAudioVisualizer()
  usePlayerVolumeDucking({
    isDialogueActive: () => props.isDialogueActive ?? false,
    onGainChange: visualizer.setOutputGain,
  })
  const currentTrack = createMemo(() => tracks()[currentIndex()])
  createEffect(() => {
    const currentIndexSnapshot = currentIndexValue()
    const nextIndex = currentIndex()

    if (nextIndex !== currentIndexSnapshot) {
      setCurrentIndex(nextIndex)
    }
  })
  let destroyed = false
  let playbackRevision = 0
  let restartPlaybackPending = false
  let restartSeekPending = false
  let playbackTransition: PlaybackTransition | null = null
  const shouldIgnoreNativePause = () =>
    getCurrentPlaybackTransition(playbackTransition, currentTrack()?.id)?.pauseProtected === true
  const clearPlaybackTransition = () => {
    playbackTransition = null
    setIsPreparing(false)
  }
  const playback = usePlayback({
    element: props.element,
    onError: (error) => {
      clearPlaybackTransition()
      cancelPendingRestart()
      visualizer.stop()
      playbackPersistence.persistPlaybackError()
      props.onError?.(error)
    },
    onPause: (wasPlaying, isUserIntent) => handlePause(wasPlaying, isUserIntent),
    onPauseRequest: (isUserIntent) => {
      clearPlaybackTransition()
      clearPendingRestart()
      if (isUserIntent) {
        playbackPersistence.persistPlaybackIntent(false)
      }
    },
    onPlay: () => handlePlay(),
    shouldIgnoreNativePause,
  })
  const {isPlaying} = playback
  const playbackPersistence = usePPlaybackPersistence({
    currentIndex,
    currentTrack,
    getAudioElement: props.element,
    isPlaying,
  })
  const getPlaybackTransition = () => {
    const transition = getCurrentPlaybackTransition(playbackTransition, currentTrack()?.id)
    if (transition === null) {
      clearPlaybackTransition()
      return null
    }

    playbackTransition = transition
    return transition
  }
  const persistPlaybackTransition = () =>
    persistRestoredPlayback({
      element: props.element(),
      trackId: currentTrack()?.id,
      transition: getPlaybackTransition(),
      writePlayback: playbackPersistence.writePlayback,
    })
  const order = usePlaybackOrder({
    createShuffleQueue,
    currentIndex,
    initialQueue: initialState.queue,
    onRestart: () => restartCurrentTrack(),
    onSelect: (options) => selectTrack(options),
    onStop: () => {
      clearPlaybackTransition()
      playback.onPause()
    },
    trackCount: () => tracks().length,
  })
  const handleStorageError = (error: unknown) => {
    const notifyError = props.onError
    if (notifyError === undefined) {
      globalThis.reportError(error)
      return
    }
    notifyError(error)
  }
  const [savedPlaylist, setSavedPlaylist] = untrack(
    (): Preference<PlaylistPreference> =>
      props.tracks === undefined
        ? usePreference({...playlistPreference, onError: handleStorageError})
        : [() => null, () => undefined],
  )
  const persistTrackQueue = (queue: readonly PTrack[]) => {
    setSavedPlaylist({trackIds: queue.map((track) => track.id)})
  }
  const clearPendingRestart = () => {
    restartPlaybackPending = false
    restartSeekPending = false
  }
  const cancelPendingRestart = () => {
    clearPendingRestart()
    playback.cancelPendingPlay()
  }
  const prepareTrackChange = (shouldResume: boolean, trackId: string) => {
    playbackTransition = shouldResume ? {pauseProtected: true, phase: 'loading', trackId} : null
    setIsPreparing(shouldResume)
  }
  createEffect(() => {
    const currentIsPlaying = isPlaying()
    untrack(() => props.onPlayingChange?.(currentIsPlaying))
  })
  const handleAudioError = playback.onError
  const playAudio = playback.play
  const previewPlayback = createPreviewPlayback({
    isPlaying,
    pausePlayer: () => playback.pause({isUserIntent: false}),
    playPlayer: playAudio,
  })
  const restorePendingPlayback = () => {
    if (destroyed) {
      return
    }

    const audioElement = props.element()
    const transition = getPlaybackTransition()
    if (transition?.phase === 'loading') {
      playbackTransition = {...transition, phase: 'awaiting-metadata'}
      audioElement?.load()
      return
    }

    if (audioElement !== undefined && audioElement.readyState < HTMLMediaElement.HAVE_METADATA) {
      audioElement.load()
      return
    }

    const restoredPlayback = playbackPersistence.applyPendingPosition()

    if (restoredPlayback !== null) {
      playbackTransition = {
        pauseProtected: restoredPlayback.isPlaying || transition?.pauseProtected === true,
        phase: 'restoring',
        playback: restoredPlayback,
        seekPending: true,
      }
    }

    if (!restoredPlayback?.isPlaying) {
      return
    }

    playAudio()
  }
  const queueController = createPlayerQueueController({
    cancelPendingRestart,
    clearPlaybackTransition,
    isPlaying,
    isQueueControlled: () => props.tracks !== undefined,
    onPlaybackRevisionChange: () => {
      playbackRevision += 1
    },
    order,
    persistTrackQueue,
    playback,
    playbackPersistence,
    prepareTrackChange,
    previewPlayback,
    readCurrentIndex: currentIndex,
    readTracks: tracks,
    restorePendingPlayback,
    setCurrentIndex,
    setLoadedTracks,
    visualizer,
  })
  const selectTrack = (options: SelectTrackOptions) => {
    const trackList = tracks()

    if (trackList.length === 0) {
      return
    }

    const shouldResume = options.shouldResume ?? isPlaying()
    const nextIndex = normalizeTrackIndex(options.index, trackList.length)

    if (nextIndex === undefined) {
      return
    }

    const nextTrack = trackList[nextIndex]
    const nextPlayback = {
      isPlaying: shouldResume,
      positionSeconds: 0,
      trackId: nextTrack.id,
      trackIndex: nextIndex,
    }
    cancelPendingRestart()
    prepareTrackChange(shouldResume, nextTrack.id)
    playback.invalidate()
    playbackRevision += 1
    playbackPersistence.setPendingPosition(nextPlayback)
    setCurrentIndex(nextIndex)
    playbackPersistence.writePlayback(nextPlayback)
    queueMicrotask(restorePendingPlayback)
  }
  let previousTrackKey: string | null = null
  createEffect(() => {
    const track = currentTrack() ?? null
    const trackKey = track === null ? null : JSON.stringify([track.id, track.source])
    const currentTrackChanged = trackKey !== previousTrackKey
    previousTrackKey = trackKey
    cancelPendingRestart()
    const shouldResumeControlledTrack = untrack(() => {
      const transition = getPlaybackTransition()
      return props.tracks !== undefined && currentTrackChanged && isPlaying() && transition === null
    })
    if (track !== null && shouldResumeControlledTrack) {
      selectTrack({index: untrack(currentIndex), shouldResume: true})
    }
    untrack(() => props.onTrackChange?.(track))
  })

  const handlePlay = () => {
    clearPlaybackTransition()
    clearPendingRestart()
    previewPlayback.stopBeforePlayback()

    playback.invalidate()
    playbackRevision += 1
    const audioElement = props.element()
    if (audioElement !== undefined) {
      visualizer.start(audioElement)
    }
    playbackPersistence.persistPlaybackIntent(true)
  }

  const handlePause = (wasPlaying: boolean, isUserIntent: boolean) => {
    clearPlaybackTransition()
    clearPendingRestart()
    if (wasPlaying) {
      playback.invalidate()
      playbackRevision += 1
    }
    visualizer.stop()
    if (isUserIntent) {
      previewPlayback.preventResume()
      playbackPersistence.persistPlaybackIntent(false)
    } else {
      playbackPersistence.persistCurrentPlayback()
    }
  }

  const restartCurrentTrack = () => {
    if (props.element() === undefined) {
      return
    }

    const track = currentTrack()
    const shouldWaitForPlay = track !== undefined && !isPlaying()
    restartPlaybackPending = shouldWaitForPlay
    restartSeekPending = track !== undefined
    clearPlaybackTransition()
    playback.seek(0)
    playbackRevision += 1
    if (track !== undefined) {
      playbackPersistence.writePlayback({
        isPlaying: true,
        positionSeconds: 0,
        trackId: track.id,
        trackIndex: currentIndex(),
      })
    }
    playAudio()
  }

  const handleSeeking = () => {
    playbackRevision += 1
    if (restartSeekPending) {
      restartSeekPending = false
      playbackPersistence.setPendingPosition(null)
      return
    }

    const transition = getPlaybackTransition()
    if (transition?.phase === 'restoring') {
      if (transition.seekPending) {
        return
      }

      const positionSeconds = readPlaybackPosition(props.element())
      playbackTransition =
        positionSeconds === null
          ? null
          : {
              ...transition,
              pauseProtected: false,
              playback: {...transition.playback, positionSeconds},
              seekPending: false,
            }
    } else if (transition?.phase === 'loading' || transition?.phase === 'awaiting-metadata') {
      const positionSeconds = readPlaybackPosition(props.element())
      playbackPersistence.setPendingPosition(
        positionSeconds === null
          ? null
          : {
              isPlaying: true,
              positionSeconds,
              trackId: transition.trackId,
              trackIndex: currentIndex(),
            },
      )
      cancelPendingRestart()
      return
    } else if (transition !== null) {
      clearPlaybackTransition()
    }

    cancelPendingRestart()
    playbackPersistence.setPendingPosition(null)
  }

  usePlaylistRestoration({
    isQueueControlled: () => props.tracks !== undefined,
    onError: handleAudioError,
    onLoad: queueController.onLoad,
    onLoadSettled: () => setIsPlaylistLoading(false),
    onRestore: queueController.initializePlayback,
    playbackRevision: () => playbackRevision,
    queueRevision: queueController.queueRevision,
    savedPlaylist,
    tracks,
  })

  const persistCurrentPlayback = () => {
    if (restartPlaybackPending) {
      return
    }

    if (persistPlaybackTransition()) {
      return
    }

    playbackPersistence.persistCurrentPlayback()
  }
  const handleSeeked = () => {
    if (restartPlaybackPending) {
      restartSeekPending = false
      return
    }

    const transition = getPlaybackTransition()
    if (transition?.phase === 'restoring') {
      const positionSeconds = readPlaybackPosition(props.element())
      if (transition.seekPending && positionSeconds === transition.playback.positionSeconds) {
        playbackTransition = transition.playback.isPlaying
          ? {...transition, seekPending: false}
          : null
        return
      }

      if (transition.playback.isPlaying && positionSeconds !== null) {
        playbackTransition = {
          ...transition,
          pauseProtected: false,
          playback: {...transition.playback, positionSeconds},
          seekPending: false,
        }
        playbackPersistence.writePlayback(playbackTransition.playback)
        return
      }

      clearPlaybackTransition()
    }

    playbackPersistence.persistSeekedPlayback()
  }
  const persistPlaybackProgress = () => {
    if (restartPlaybackPending) {
      return
    }

    if (persistPlaybackTransition()) {
      return
    }

    playbackPersistence.persistPlaybackProgress()
  }

  if (typeof globalThis.addEventListener === 'function') {
    useEvent(globalThis, 'pagehide', persistCurrentPlayback)
  }

  onCleanup(() => {
    if (props.stopOnUnmount) {
      clearPlaybackTransition()
      playback.stop()
      if (playbackRevision === 0) {
        stopPPlayback().catch(globalThis.reportError)
      } else {
        playbackPersistence.persistStoppedPlayback()
      }
    } else {
      persistCurrentPlayback()
    }
    destroyed = true
  })

  return {
    addTracksToQueue: queueController.addTracksToQueue,
    canEditQueue: () => props.tracks === undefined,
    canNavigateNextTrack: order.canNavigateNextTrack,
    canNavigatePreviousTrack: order.canNavigatePreviousTrack,
    clearTrackQueue: queueController.clearTrackQueue,
    currentIndex,
    currentTrack,
    invalidate: playback.invalidate,
    isPlaying,
    isPlaylistLoading,
    isPreparing,
    levels: visualizer.levels,
    markPauseIntent: playback.markPauseIntent,
    onEnded: order.handleEnded,
    onError: playback.onError,
    onLoadedMetadata: restorePendingPlayback,
    onPause: playback.onPause,
    onPlay: playback.onPlay,
    onSeeked: handleSeeked,
    onSeeking: handleSeeking,
    onTimeUpdate: persistPlaybackProgress,
    pause: playback.pause,
    play: playback.play,
    previewPlayback,
    removeTrackFromQueue: queueController.removeTrackFromQueue,
    repeatMode: order.repeatMode,
    seek: playback.seek,
    selectChosenTrack: order.selectChosenTrack,
    selectNextTrack: order.selectNextTrack,
    selectPreviousTrack: order.selectPreviousTrack,
    shuffleEnabled: order.shuffleEnabled,
    stop: playback.stop,
    toggleRepeatMode: order.toggleRepeatMode,
    toggleShuffle: order.toggleShuffle,
    tracks,
  }
}
