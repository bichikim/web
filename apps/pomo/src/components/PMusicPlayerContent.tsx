import {batch, createEffect, createMemo, createSignal, onCleanup, onMount, untrack} from 'solid-js'

import {
  createInitialPlaybackState,
  createShuffleQueue,
  loadPTracks,
  type PPlaybackState,
  type PTrack,
  readPPlayback,
  type RepeatMode,
  resolvePlaybackRestore,
  resolveTrackEnd,
  usePAudioVisualizer,
  usePPlaybackPersistence,
} from '../features/focus-room-audio'
import {MusicPlayerView} from './MusicPlayerView'

interface PMusicPlayerContentProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onTrackChange?: (track: PTrack | null) => void
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
  let destroyed = false
  let playbackRequestRevision = 0
  let playbackRevision = 0
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

  onMount(() => {
    const restoreRevision = playbackRevision
    const storedPlaybackRequest = readPPlayback()

    if (props.tracks === undefined) {
      loadPTracks({signal: playlistRequest.signal})
        // oxlint-disable-next-line solid/reactivity -- Completion must apply the user's latest shuffle choice.
        .then((nextTracks) => {
          if (destroyed) {
            return
          }

          initializePlayback(nextTracks, null)
          // oxlint-disable-next-line solid/reactivity -- Late storage must respect the latest playback revision.
          storedPlaybackRequest.then((storedPlayback) => {
            if (!destroyed && playbackRevision === restoreRevision && storedPlayback !== null) {
              initializePlayback(nextTracks, storedPlayback)
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

    audioElement?.addEventListener('play', handlePlay)
    audioElement?.addEventListener('pause', handlePause)
    audioElement?.addEventListener('ended', handleEnded)
    audioElement?.addEventListener('error', handleAudioError)
    audioElement?.addEventListener('loadedmetadata', restorePendingPlayback)
    audioElement?.addEventListener('seeking', handleSeeking)
    audioElement?.addEventListener('seeked', playbackPersistence.persistCurrentPlayback)
    audioElement?.addEventListener('timeupdate', playbackPersistence.persistPlaybackProgress)
    window.addEventListener('pagehide', playbackPersistence.persistCurrentPlayback)
  })

  onCleanup(() => {
    playbackPersistence.persistCurrentPlayback()
    destroyed = true
    playlistRequest.abort()
    audioElement?.removeEventListener('play', handlePlay)
    audioElement?.removeEventListener('pause', handlePause)
    audioElement?.removeEventListener('ended', handleEnded)
    audioElement?.removeEventListener('error', handleAudioError)
    audioElement?.removeEventListener('loadedmetadata', restorePendingPlayback)
    audioElement?.removeEventListener('seeking', handleSeeking)
    audioElement?.removeEventListener('seeked', playbackPersistence.persistCurrentPlayback)
    audioElement?.removeEventListener('timeupdate', playbackPersistence.persistPlaybackProgress)
    window.removeEventListener('pagehide', playbackPersistence.persistCurrentPlayback)
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
      onExpandedChange={toggleExpanded}
      onNextTrack={selectNextTrack}
      onPreviousTrack={selectPreviousTrack}
      onRepeatModeChange={toggleRepeatMode}
      onShuffleChange={toggleShuffle}
      onTrackSelect={selectChosenTrack}
      repeatMode={repeatMode()}
      shuffleEnabled={shuffleEnabled()}
      tracks={tracks()}
    />
  )
}
