import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {
  appendUniqueTracks,
  createInitialPlaybackState,
  normalizeTrackIndex,
  type PPlaybackState,
  type PTrack,
  resolvePlaybackRestore,
  resolveTrackRemoval,
  stopPPlayback,
  usePAudioVisualizer,
  usePPlaybackPersistence,
  writePPlaylist,
} from '../../features/focus-room-audio'
import {usePlayerVolumeDucking} from '../../features/focus-room-dialogue'
import type {MediaPlayerOptions, PlayerState, SelectTrackOptions} from './types'
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

/** 음악 목록, 곡 선택·반복·셔플 정책, 저장된 재생 위치 복원과 미리듣기를 조율한다. */
// oxlint-disable-next-line eslint/max-lines-per-function, eslint/max-statements -- Queue edits coordinate selection, transport invalidation and persistence in the same transaction.
export const usePlayerController = (props: UsePlayerControllerProps): PlayerController => {
  const initialTracks = untrack(() => props.tracks ?? [])
  const initialState = createInitialPlaybackState({trackCount: initialTracks.length})
  const [loadedTracks, setLoadedTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const [isPlaylistLoading, setIsPlaylistLoading] = createSignal(props.tracks === undefined)
  const tracks = () => props.tracks ?? loadedTracks()
  const [currentIndex, setCurrentIndex] = createSignal(initialState.currentIndex)
  const visualizer = usePAudioVisualizer()
  usePlayerVolumeDucking({
    isDialogueActive: () => props.isDialogueActive ?? false,
    onGainChange: visualizer.setOutputGain,
  })
  const currentTrack = createMemo(() => tracks()[currentIndex()])
  let destroyed = false
  let playbackRevision = 0
  let queueRevision = 0
  let initialPlaylistResolved = untrack(() => props.tracks !== undefined)
  let clearedBeforeLoad = false
  let restartPlaybackPending = false
  let restartSeekPending = false
  let playbackTransition: PlaybackTransition | null = null
  const removedBeforeLoad = new Set<string>()
  const shouldIgnoreNativePause = () =>
    getCurrentPlaybackTransition(playbackTransition, currentTrack()?.id)?.pauseProtected === true
  const playback = usePlayback({
    element: props.element,
    onError: (error) => {
      playbackTransition = null
      cancelPendingRestart()
      visualizer.stop()
      playbackPersistence.persistPlaybackError()
      props.onError?.(error)
    },
    onPause: (wasPlaying, isUserIntent) => handlePause(wasPlaying, isUserIntent),
    onPauseRequest: (isUserIntent) => {
      playbackTransition = null
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
    currentTrack,
    getAudioElement: props.element,
    isPlaying,
  })
  const getPlaybackTransition = () => {
    playbackTransition = getCurrentPlaybackTransition(playbackTransition, currentTrack()?.id)
    return playbackTransition
  }
  const persistPlaybackTransition = () =>
    persistRestoredPlayback({
      element: props.element(),
      trackId: currentTrack()?.id,
      transition: getPlaybackTransition(),
      writePlayback: playbackPersistence.writePlayback,
    })
  const order = usePlaybackOrder({
    currentIndex,
    initialQueue: initialState.queue,
    onRestart: () => restartCurrentTrack(),
    onSelect: (options) => selectTrack(options),
    onStop: () => {
      playbackTransition = null
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
  const persistTrackQueue = (queue: readonly PTrack[]) => {
    writePPlaylist(queue.map((track) => track.id)).catch(handleStorageError)
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
  }
  createEffect(() => {
    const currentIsPlaying = isPlaying()
    untrack(() => props.onPlayingChange?.(currentIsPlaying))
  })
  const initializePlayback = (
    nextTracks: readonly PTrack[],
    storedPlayback: PPlaybackState | null,
  ) => {
    const fallbackIndex =
      storedPlayback === null
        ? createInitialPlaybackState({trackCount: nextTracks.length}).currentIndex
        : currentIndex()
    const restoration = resolvePlaybackRestore({
      fallbackIndex,
      storedPlayback,
      tracks: nextTracks,
    })

    playbackPersistence.setPendingPosition(restoration.playback)

    batch(() => {
      setLoadedTracks(nextTracks)
      setCurrentIndex(restoration.currentIndex)
    })
    order.resetOrder()

    if (restoration.shouldPersist && restoration.playback !== null) {
      playbackPersistence.writePlayback(restoration.playback)
    }

    queueMicrotask(restorePendingPlayback)
  }
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
    const nextPlayback = {isPlaying: shouldResume, positionSeconds: 0, trackId: nextTrack.id}
    cancelPendingRestart()
    prepareTrackChange(shouldResume, nextTrack.id)
    playback.invalidate()
    playbackRevision += 1
    playbackPersistence.setPendingPosition(nextPlayback)
    setCurrentIndex(nextIndex)
    playbackPersistence.writePlayback(nextPlayback)
    queueMicrotask(restorePendingPlayback)
  }
  createEffect(() => {
    const track = currentTrack() ?? null
    cancelPendingRestart()
    const shouldResumeControlledTrack = untrack(
      () =>
        props.tracks !== undefined &&
        isPlaying() &&
        getCurrentPlaybackTransition(playbackTransition, track?.id) === null,
    )
    if (track !== null && shouldResumeControlledTrack) {
      selectTrack({index: untrack(currentIndex), shouldResume: true})
    }
    untrack(() => props.onTrackChange?.(track))
  })

  const handlePlay = () => {
    playbackTransition = null
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
    playbackTransition = null
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

  const addTracksToQueue = (tracksToAdd: readonly PTrack[]) => {
    if (props.tracks !== undefined || tracksToAdd.length === 0) {
      return
    }

    const currentTracks = tracks()
    const nextTracks = appendUniqueTracks(currentTracks, tracksToAdd)

    if (nextTracks === currentTracks) {
      return
    }

    queueRevision += 1
    setLoadedTracks(nextTracks)
    persistTrackQueue(nextTracks)
    order.resetOrder()
  }

  const removeTrackFromQueue = (removeIndex: number) => {
    const currentTracks = tracks()

    if (
      props.tracks !== undefined ||
      !Number.isInteger(removeIndex) ||
      removeIndex < 0 ||
      removeIndex >= currentTracks.length
    ) {
      return
    }

    const resolution = resolveTrackRemoval({
      currentIndex: currentIndex(),
      removeIndex,
      trackCount: currentTracks.length,
    })
    const nextTracks = currentTracks.filter((_track, index) => index !== removeIndex)
    const removedTrack = currentTracks[removeIndex]
    const nextTrack = nextTracks[resolution.nextCurrentIndex]
    const shouldResume = isPlaying()

    if (!initialPlaylistResolved && removedTrack !== undefined) {
      removedBeforeLoad.add(removedTrack.id)
    }

    cancelPendingRestart()
    playback.invalidate()
    playbackRevision += 1
    queueRevision += 1

    if (resolution.currentTrackChanged && nextTrack !== undefined) {
      const nextPlayback = {isPlaying: shouldResume, positionSeconds: 0, trackId: nextTrack.id}
      prepareTrackChange(shouldResume, nextTrack.id)
      playbackPersistence.setPendingPosition(nextPlayback)
      playbackPersistence.writePlayback(nextPlayback)
    }

    if (nextTrack === undefined) {
      playbackTransition = null
      visualizer.stop()
      playback.stop()
      playbackPersistence.persistStoppedPlayback()
      playbackPersistence.setPendingPosition(null)
    }

    batch(() => {
      setLoadedTracks(nextTracks)
      setCurrentIndex(resolution.nextCurrentIndex)
    })
    persistTrackQueue(nextTracks)
    order.resetOrder()

    if (nextTrack === undefined) {
      return
    }

    if (resolution.currentTrackChanged) {
      queueMicrotask(restorePendingPlayback)
    }
  }

  const clearTrackQueue = () => {
    const currentTracks = tracks()

    if (props.tracks !== undefined || currentTracks.length === 0) {
      return
    }

    if (!initialPlaylistResolved) {
      clearedBeforeLoad = true
    }

    cancelPendingRestart()
    playbackTransition = null
    playback.invalidate()
    playbackRevision += 1
    queueRevision += 1
    previewPlayback.preventResume()
    visualizer.stop()
    playback.stop()
    playbackPersistence.persistStoppedPlayback()
    playbackPersistence.setPendingPosition(null)

    batch(() => {
      setLoadedTracks([])
      setCurrentIndex(0)
    })
    persistTrackQueue([])
    order.clearShuffleQueue()
  }

  const restartCurrentTrack = () => {
    if (props.element() === undefined) {
      return
    }

    const track = currentTrack()
    const shouldWaitForPlay = track !== undefined && !isPlaying()
    restartPlaybackPending = shouldWaitForPlay
    restartSeekPending = shouldWaitForPlay
    playbackTransition = null
    playback.seek(0)
    playbackRevision += 1
    if (track !== undefined) {
      playbackPersistence.writePlayback({isPlaying: true, positionSeconds: 0, trackId: track.id})
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
      const positionSeconds = readPlaybackPosition(props.element())
      if (transition.seekPending && positionSeconds === transition.playback.positionSeconds) {
        return
      }

      playbackTransition =
        positionSeconds === null
          ? null
          : {
              ...transition,
              pauseProtected: false,
              playback: {...transition.playback, positionSeconds},
              seekPending: false,
            }
    } else if (transition !== null) {
      playbackTransition = null
    }

    cancelPendingRestart()
    playbackPersistence.setPendingPosition(null)
  }

  usePlaylistRestoration({
    isQueueControlled: () => props.tracks !== undefined,
    onError: handleAudioError,
    onLoad: (loaded) => {
      initialPlaylistResolved = true
      const availableTracks = clearedBeforeLoad
        ? []
        : loaded.defaultTracks.filter((track) => !removedBeforeLoad.has(track.id))
      if (loaded.queueChanged) {
        const activeTrackId = currentTrack()?.id
        const mergedTracks = appendUniqueTracks(availableTracks, tracks())
        const activeIndex = mergedTracks.findIndex((track) => track.id === activeTrackId)
        batch(() => {
          setLoadedTracks(mergedTracks)
          setCurrentIndex(activeIndex < 0 ? 0 : activeIndex)
        })
        persistTrackQueue(mergedTracks)
        order.resetOrder()
      } else {
        initializePlayback(availableTracks, null)
      }
      return availableTracks
    },
    onLoadSettled: () => setIsPlaylistLoading(false),
    onRestore: initializePlayback,
    playbackRevision: () => playbackRevision,
    queueRevision: () => queueRevision,
    tracks,
  })

  const {window} = globalThis
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

      playbackTransition = null
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

  if (typeof window !== 'undefined') {
    useEvent(window, 'pagehide', persistCurrentPlayback)
  }

  onCleanup(() => {
    if (props.stopOnUnmount) {
      playbackTransition = null
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
    addTracksToQueue,
    canEditQueue: () => props.tracks === undefined,
    canNavigateNextTrack: order.canNavigateNextTrack,
    canNavigatePreviousTrack: order.canNavigatePreviousTrack,
    clearTrackQueue,
    currentIndex,
    currentTrack,
    invalidate: playback.invalidate,
    isPlaying,
    isPlaylistLoading,
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
    removeTrackFromQueue,
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
