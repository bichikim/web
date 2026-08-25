import {batch, createEffect, createMemo, createSignal, onCleanup, onMount, untrack} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {
  appendUniqueTracks,
  createInitialPlaybackState,
  createShuffleQueue,
  loadPTracks,
  type PPlaybackState,
  type PTrack,
  readPPlayback,
  type RepeatMode,
  resolvePlaybackRestore,
  resolveTrackEnd,
  resolveTrackRemoval,
  usePAudioVisualizer,
  usePlayerMediaSession,
  usePPlaybackPersistence,
} from '../../features/focus-room-audio'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {MusicPlayerView} from '../MusicPlayerView'

interface PMusicPlayerContentProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onPlayingChange?: (isPlaying: boolean) => void
  readonly onTrackChange?: (track: PTrack | null) => void
  readonly sceneStyle?: PSceneStyle
  readonly tracks?: readonly PTrack[]
}

interface SelectTrackOptions {
  readonly index: number
  readonly shouldResume?: boolean
}

interface SelectRandomTrackOptions {
  readonly shouldResume?: boolean
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

// oxlint-disable-next-line eslint/max-lines-per-function, eslint/max-statements -- Media Chrome's control tree is one semantic unit.
export default function PMusicPlayerContent(props: PMusicPlayerContentProps) {
  const initialTracks = untrack(() => props.tracks ?? [])
  const initialState = createInitialPlaybackState({trackCount: initialTracks.length})
  const [loadedTracks, setLoadedTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const tracks = () => props.tracks ?? loadedTracks()
  const [currentIndex, setCurrentIndex] = createSignal(initialState.currentIndex)
  const [internalExpanded, setInternalExpanded] = createSignal(false)
  const expanded = () => props.expanded ?? internalExpanded()
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>('repeat-all')
  const [shuffleEnabled, setShuffleEnabled] = createSignal(true)
  const visualizer = usePAudioVisualizer()
  const currentTrack = createMemo(() => tracks()[currentIndex()])
  const playlistRequest = new AbortController()
  let audioElement: HTMLAudioElement | undefined
  let activePreviewStop: (() => void) | undefined
  let resumeAfterPreview = false
  let destroyed = false
  let playbackRequestRevision = 0
  let playbackRevision = 0
  let queueRevision = 0
  let initialPlaylistResolved = untrack(() => props.tracks !== undefined)
  let wasClearedBeforeInitialLoad = false
  const removedTrackIdsBeforeInitialLoad = new Set<string>()
  let shuffleQueue = initialState.queue
  let shuffleHistory: number[] = []
  const playbackPersistence = usePPlaybackPersistence({
    currentTrack,
    getAudioElement: () => audioElement,
    isPlaying,
  })

  createEffect(() => {
    const track = currentTrack() ?? null
    untrack(() => props.onTrackChange)?.(track)
  })

  createEffect(() => {
    const currentIsPlaying = isPlaying()
    untrack(() => props.onPlayingChange)?.(currentIsPlaying)
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
    shuffleQueue = createShuffleQueue({
      currentIndex: restoration.currentIndex,
      trackCount: nextTracks.length,
    })
    shuffleHistory = []

    if (restoration.shouldPersist && restoration.playback !== null) {
      playbackPersistence.writePlayback(restoration.playback)
    }

    queueMicrotask(restorePendingPlayback)
  }

  const handleAudioError = (error?: unknown) => {
    if (isAbortError(error)) {
      return
    }

    if (destroyed) {
      return
    }

    setIsPlaying(false)
    visualizer.stop()
    playbackPersistence.persistCurrentPlayback()
  }

  const playAudio = () => {
    const requestRevision = (playbackRequestRevision += 1)
    audioElement?.play().catch((error: unknown) => {
      if (requestRevision === playbackRequestRevision) {
        handleAudioError(error)
      }
    })
  }

  const restorePendingPlayback = () => {
    if (destroyed) {
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
    const nextIndex = (options.index + trackList.length) % trackList.length
    const nextTrack = trackList[nextIndex]
    const nextPlayback = {isPlaying: shouldResume, positionSeconds: 0, trackId: nextTrack.id}
    playbackRequestRevision += 1
    playbackRevision += 1
    playbackPersistence.setPendingPosition(nextPlayback)
    setCurrentIndex(nextIndex)
    playbackPersistence.writePlayback(nextPlayback)
    queueMicrotask(restorePendingPlayback)
  }

  const handlePlay = () => {
    const stopPreview = activePreviewStop

    if (stopPreview !== undefined) {
      activePreviewStop = undefined
      resumeAfterPreview = false
      stopPreview()
    }

    playbackRequestRevision += 1
    playbackRevision += 1
    setIsPlaying(true)
    if (audioElement) {
      visualizer.start(audioElement)
    }
    playbackPersistence.persistCurrentPlayback()
  }

  const handlePause = () => {
    const wasPlaying = isPlaying()
    if (wasPlaying) {
      playbackRequestRevision += 1
      playbackRevision += 1
    }
    setIsPlaying(false)
    visualizer.stop()
    playbackPersistence.persistCurrentPlayback()
  }

  const handlePreviewStart = (stopPreview: () => void) => {
    const previousStop = activePreviewStop

    if (previousStop !== undefined) {
      activePreviewStop = undefined
      resumeAfterPreview = false
      previousStop()
    }

    resumeAfterPreview = isPlaying()
    activePreviewStop = stopPreview
    audioElement?.pause()
  }

  const handlePreviewEnd = () => {
    if (activePreviewStop === undefined) {
      return
    }

    activePreviewStop = undefined
    const shouldResume = resumeAfterPreview
    resumeAfterPreview = false

    if (shouldResume) {
      playAudio()
    }
  }

  const resetShuffleQueue = (currentTrackIndex = currentIndex()) => {
    shuffleQueue = createShuffleQueue({
      currentIndex: currentTrackIndex,
      trackCount: tracks().length,
    })
  }

  const selectRandomTrack = (options: SelectRandomTrackOptions = {}) => {
    const trackCount = tracks().length

    if (trackCount < 2) {
      selectTrack({index: currentIndex(), shouldResume: options.shouldResume})
      return
    }

    const nextIndex = shuffleQueue.shift()

    if (nextIndex === undefined) {
      return
    }

    shuffleHistory.push(currentIndex())
    selectTrack({index: nextIndex, shouldResume: options.shouldResume})
  }

  const selectPreviousTrack = () => {
    if (!shuffleEnabled() || shuffleHistory.length === 0) {
      selectTrack({index: currentIndex() - 1})
      return
    }

    const previousIndex = shuffleHistory.pop()

    if (previousIndex === undefined) {
      return
    }

    shuffleQueue.unshift(currentIndex())
    selectTrack({index: previousIndex})
  }

  const toggleShuffle = () => {
    const enabled = !shuffleEnabled()
    shuffleQueue = enabled
      ? createShuffleQueue({currentIndex: currentIndex(), trackCount: tracks().length})
      : []
    shuffleHistory = []
    setShuffleEnabled(enabled)
  }

  const toggleRepeatMode = (mode: Exclude<RepeatMode, 'none'>) => {
    setRepeatMode((currentMode) => (currentMode === mode ? 'none' : mode))
  }

  const toggleExpanded = () => {
    const nextExpanded = !expanded()

    if (props.expanded === undefined) {
      setInternalExpanded(nextExpanded)
    }

    props.onExpandedChange?.(nextExpanded)
  }

  const selectChosenTrack = (index: number) => {
    if (shuffleEnabled()) {
      resetShuffleQueue(index)
      shuffleHistory = []
    }

    selectTrack({index})
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
    shuffleQueue = createShuffleQueue({
      currentIndex: currentIndex(),
      trackCount: nextTracks.length,
    })
    shuffleHistory = []
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
      removedTrackIdsBeforeInitialLoad.add(removedTrack.id)
    }

    playbackRequestRevision += 1
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
    shuffleQueue = createShuffleQueue({
      currentIndex: resolution.nextCurrentIndex,
      trackCount: nextTracks.length,
    })
    shuffleHistory = []

    if (nextTrack === undefined) {
      setIsPlaying(false)
      visualizer.stop()
      audioElement?.pause()
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
      wasClearedBeforeInitialLoad = true
    }

    playbackRequestRevision += 1
    playbackRevision += 1
    queueRevision += 1
    resumeAfterPreview = false
    playbackPersistence.setPendingPosition(null)

    batch(() => {
      setLoadedTracks([])
      setCurrentIndex(0)
      setIsPlaying(false)
    })
    shuffleQueue = []
    shuffleHistory = []
    visualizer.stop()
    audioElement?.pause()
  }

  const restartCurrentTrack = () => {
    if (!audioElement) {
      return
    }

    audioElement.currentTime = 0
    playbackRevision += 1
    const track = currentTrack()
    if (track !== undefined) {
      playbackPersistence.writePlayback({isPlaying: true, positionSeconds: 0, trackId: track.id})
    }
    playAudio()
  }

  const handleSeeking = () => {
    playbackRevision += 1
    playbackPersistence.setPendingPosition(null)
  }

  const selectNextTrack = () => {
    if (tracks().length < 2) {
      restartCurrentTrack()
      return
    }

    if (shuffleEnabled()) {
      if (shuffleQueue.length === 0) {
        resetShuffleQueue()
      }
      selectRandomTrack()
      return
    }

    selectTrack({index: currentIndex() + 1})
  }

  const handleEnded = () => {
    const action = resolveTrackEnd({
      currentIndex: currentIndex(),
      repeatMode: repeatMode(),
      shuffleEnabled: shuffleEnabled(),
      shuffleRemaining: shuffleQueue.length,
      trackCount: tracks().length,
    })

    switch (action) {
      case 'play-first':
        selectTrack({index: 0, shouldResume: true})
        return
      case 'play-next':
        selectTrack({index: currentIndex() + 1, shouldResume: true})
        return
      case 'play-shuffled':
        selectRandomTrack({shouldResume: true})
        return
      case 'restart-current':
        restartCurrentTrack()
        return
      case 'restart-shuffle':
        resetShuffleQueue()
        selectRandomTrack({shouldResume: true})
        return
      case 'stop':
        handlePause()
        return
      default: {
        const unexpectedAction: never = action
        throw new Error(`Unsupported track end action: ${unexpectedAction}`)
      }
    }
  }

  usePlayerMediaSession({
    currentTrack,
    isPlaying,
    onNextTrack: selectNextTrack,
    onPause: () => audioElement?.pause(),
    onPlay: playAudio,
    onPreviousTrack: selectPreviousTrack,
  })

  onMount(() => {
    const restoreRevision = playbackRevision
    const restoreQueueRevision = queueRevision
    const storedPlaybackRequest = readPPlayback()

    if (props.tracks === undefined) {
      loadPTracks({signal: playlistRequest.signal})
        // oxlint-disable-next-line solid/reactivity -- Completion must apply the user's latest shuffle choice.
        .then((nextTracks) => {
          if (destroyed) {
            return
          }

          initialPlaylistResolved = true
          const availableTracks = wasClearedBeforeInitialLoad
            ? []
            : nextTracks.filter((track) => !removedTrackIdsBeforeInitialLoad.has(track.id))

          if (queueRevision === restoreQueueRevision) {
            initializePlayback(availableTracks, null)
          } else {
            const activeTrackId = currentTrack()?.id
            const mergedTracks = appendUniqueTracks(availableTracks, tracks())
            const activeIndex = mergedTracks.findIndex((track) => track.id === activeTrackId)

            batch(() => {
              setLoadedTracks(mergedTracks)
              setCurrentIndex(activeIndex < 0 ? 0 : activeIndex)
            })
            shuffleQueue = createShuffleQueue({
              currentIndex: activeIndex < 0 ? 0 : activeIndex,
              trackCount: mergedTracks.length,
            })
            shuffleHistory = []
          }
          // oxlint-disable-next-line solid/reactivity -- Late storage must respect the latest playback revision.
          storedPlaybackRequest.then((storedPlayback) => {
            if (
              !destroyed &&
              playbackRevision === restoreRevision &&
              queueRevision === restoreQueueRevision &&
              storedPlayback !== null
            ) {
              initializePlayback(availableTracks, storedPlayback)
            }
          })
        })
        .catch((error: unknown) => {
          handleAudioError(error)
        })
    } else {
      // oxlint-disable-next-line solid/reactivity -- Completion restores against the latest controlled tracks.
      storedPlaybackRequest.then((storedPlayback) => {
        if (!destroyed && playbackRevision === restoreRevision && storedPlayback !== null) {
          initializePlayback(tracks(), storedPlayback)
        }
      })
    }

    useEvent(audioElement ?? null, 'play', handlePlay)
    useEvent(audioElement ?? null, 'pause', handlePause)
    useEvent(audioElement ?? null, 'ended', handleEnded)
    useEvent(audioElement ?? null, 'error', handleAudioError)
    useEvent(audioElement ?? null, 'loadedmetadata', restorePendingPlayback)
    useEvent(audioElement ?? null, 'seeking', handleSeeking)
    useEvent(audioElement ?? null, 'seeked', playbackPersistence.persistCurrentPlayback)
    useEvent(audioElement ?? null, 'timeupdate', playbackPersistence.persistPlaybackProgress)
    useEvent(window, 'pagehide', playbackPersistence.persistCurrentPlayback)
  })

  onCleanup(() => {
    playbackPersistence.persistCurrentPlayback()
    destroyed = true
    playlistRequest.abort()
    audioElement?.pause()
  })

  return (
    <MusicPlayerView
      currentIndex={currentIndex()}
      currentTrack={currentTrack()}
      expanded={expanded()}
      isPlaying={isPlaying()}
      levels={visualizer.levels()}
      onAudioElement={(element) => {
        audioElement = element
      }}
      onAlbumAdd={addTracksToQueue}
      onAlbumClear={props.tracks === undefined ? clearTrackQueue : undefined}
      onExpandedChange={toggleExpanded}
      onNextTrack={selectNextTrack}
      onPreviousTrack={selectPreviousTrack}
      onPreviewEnd={handlePreviewEnd}
      onPreviewStart={handlePreviewStart}
      onRepeatModeChange={toggleRepeatMode}
      onShuffleChange={toggleShuffle}
      onTrackRemove={props.tracks === undefined ? removeTrackFromQueue : undefined}
      onTrackSelect={selectChosenTrack}
      repeatMode={repeatMode()}
      sceneStyle={props.sceneStyle}
      shuffleEnabled={shuffleEnabled()}
      tracks={tracks()}
    />
  )
}
