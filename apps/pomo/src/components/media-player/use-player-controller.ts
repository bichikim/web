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

export interface UsePlayerControllerProps extends MediaPlayerOptions {
  readonly element: Accessor<HTMLAudioElement | undefined>
}

export interface PlayerMediaEvents {
  readonly onEnded: () => void
  readonly onLoadedMetadata: () => void
  readonly onSeeked: () => void
  readonly onSeeking: () => void
  readonly onTimeUpdate: () => void
}

export interface PlayerController extends PlayerState {
  readonly playback: Playback
  readonly mediaEvents: PlayerMediaEvents
}

/** 음악 목록, 곡 선택·반복·셔플 정책, 저장된 재생 위치 복원과 미리듣기를 조율한다. */
// oxlint-disable-next-line eslint/max-lines-per-function, eslint/max-statements -- Queue edits coordinate selection, transport invalidation and persistence in the same transaction.
export const usePlayerController = (props: UsePlayerControllerProps): PlayerController => {
  const initialTracks = untrack(() => props.tracks ?? [])
  const initialState = createInitialPlaybackState({trackCount: initialTracks.length})
  const [loadedTracks, setLoadedTracks] = createSignal<readonly PTrack[]>(initialTracks)
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
  const removedBeforeLoad = new Set<string>()
  const playback = usePlayback({
    element: props.element,
    onError: (error) => {
      cancelPendingRestart()
      visualizer.stop()
      playbackPersistence.persistCurrentPlayback()
      props.onError?.(error)
    },
    onPause: (wasPlaying, isUserIntent) => handlePause(wasPlaying, isUserIntent),
    onPauseRequest: (isUserIntent) => {
      clearPendingRestart()
      if (isUserIntent) {
        playbackPersistence.persistPlaybackIntent(false)
      }
    },
    onPlay: () => handlePlay(),
  })
  const {isPlaying} = playback
  const playbackPersistence = usePPlaybackPersistence({
    currentTrack,
    getAudioElement: props.element,
    isPlaying,
  })

  const order = usePlaybackOrder({
    currentIndex,
    initialQueue: initialState.queue,
    onRestart: () => restartCurrentTrack(),
    onSelect: (options) => selectTrack(options),
    onStop: playback.events.onPause,
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

  createEffect(() => {
    const track = currentTrack() ?? null
    cancelPendingRestart()
    untrack(() => props.onTrackChange?.(track))
  })

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

  const handleAudioError = playback.handleError
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
    if (audioElement !== undefined && audioElement.readyState < HTMLMediaElement.HAVE_METADATA) {
      audioElement.load()
      return
    }

    const restoredPlayback = playbackPersistence.applyPendingPosition()

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
    playback.invalidate()
    playbackRevision += 1
    playbackPersistence.setPendingPosition(nextPlayback)
    setCurrentIndex(nextIndex)
    playbackPersistence.writePlayback(nextPlayback)
    queueMicrotask(restorePendingPlayback)
  }

  const handlePlay = () => {
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
    clearPendingRestart()
    if (wasPlaying) {
      playback.invalidate()
      playbackRevision += 1
    }
    visualizer.stop()
    if (isUserIntent) {
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
      playbackPersistence.setPendingPosition(nextPlayback)
      playbackPersistence.writePlayback(nextPlayback)
    } else if (nextTrack === undefined) {
      playbackPersistence.setPendingPosition(null)
    }

    batch(() => {
      setLoadedTracks(nextTracks)
      setCurrentIndex(resolution.nextCurrentIndex)
    })
    persistTrackQueue(nextTracks)
    order.resetOrder()

    if (nextTrack === undefined) {
      visualizer.stop()
      playback.stop()
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
    playback.invalidate()
    playbackRevision += 1
    queueRevision += 1
    previewPlayback.preventResume()
    playbackPersistence.setPendingPosition(null)

    batch(() => {
      setLoadedTracks([])
      setCurrentIndex(0)
    })
    persistTrackQueue([])
    order.clearShuffleQueue()
    visualizer.stop()
    playback.stop()
  }

  const restartCurrentTrack = () => {
    if (props.element() === undefined) {
      return
    }

    const track = currentTrack()
    const shouldWaitForPlay = track !== undefined && !isPlaying()
    restartPlaybackPending = shouldWaitForPlay
    restartSeekPending = shouldWaitForPlay
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

    playbackPersistence.persistCurrentPlayback()
  }
  const handleSeeked = () => {
    if (restartPlaybackPending) {
      restartSeekPending = false
      return
    }

    persistCurrentPlayback()
  }
  const persistPlaybackProgress = () => {
    if (restartPlaybackPending) {
      return
    }

    playbackPersistence.persistPlaybackProgress()
  }

  if (typeof window !== 'undefined') {
    useEvent(window, 'pagehide', persistCurrentPlayback)
  }

  onCleanup(() => {
    if (props.stopOnUnmount) {
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
    isPlaying,
    levels: visualizer.levels,
    mediaEvents: {
      onEnded: order.handleEnded,
      onLoadedMetadata: restorePendingPlayback,
      onSeeked: handleSeeked,
      onSeeking: handleSeeking,
      onTimeUpdate: persistPlaybackProgress,
    },
    playback,
    previewPlayback,
    removeTrackFromQueue,
    repeatMode: order.repeatMode,
    selectChosenTrack: order.selectChosenTrack,
    selectNextTrack: order.selectNextTrack,
    selectPreviousTrack: order.selectPreviousTrack,
    shuffleEnabled: order.shuffleEnabled,
    toggleRepeatMode: order.toggleRepeatMode,
    toggleShuffle: order.toggleShuffle,
    tracks,
  }
}
