import 'media-chrome'

import {cx} from 'class-variance-authority'
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
} from 'solid-js'

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
import {PPlaybackModes} from './PPlaybackModes'
import {PTrackList} from './PTrackList'

const ACTIVE_VISUALIZER_OPACITY = 0.76
const IDLE_VISUALIZER_OPACITY = 0.34
const SKIP_BUTTON_CLASSES = cx(
  'pomo-player__skip grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 max-[28rem]:size-9',
)
const MEDIA_FOCUS_CLASSES =
  'focus-visible:outline-none [--media-focus-box-shadow:inset_0_0_0_2px_var(--pomo-secondary)]'

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
    <div
      class={cx(
        'pomo-player-stage absolute inset-x-[var(--pomo-padding-lg)]',
        'bottom-[calc(var(--pomo-padding-lg)+env(safe-area-inset-bottom))]',
        'sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[min(29rem,calc(100vw-3rem))]',
      )}
    >
      <media-controller
        audio=""
        class={cx(
          'pomo-player pomo-player-shell relative w-full overflow-hidden',
          'p-[var(--pomo-padding-sm)]',
          'rounded-[var(--pomo-radius-panel)]',
        )}
      >
        <audio
          crossorigin="anonymous"
          preload="metadata"
          ref={(element) => {
            audioElement = element
          }}
          slot="media"
          src={currentTrack()?.source}
        />

        <div
          aria-hidden="true"
          class="pomo-player__base pomo-backdrop pointer-events-none absolute inset-0"
        />

        <div
          class={cx(
            'pomo-player__visualizer-frame pointer-events-none absolute',
            'inset-x-0 top-0 overflow-hidden',
            expanded() ? 'h-18' : 'bottom-0',
          )}
        >
          <div
            aria-label="오디오 주파수 레벨"
            class="pomo-player__visualizer absolute flex items-end gap-0.5"
          >
            <For each={visualizer.levels()}>
              {(level) => (
                <span
                  aria-hidden="true"
                  class={cx(
                    'pomo-level min-w-0 flex-1 rounded-t-full',
                    'transition-[height,opacity] duration-75',
                  )}
                  style={{
                    height: `${level}%`,
                    opacity: isPlaying() ? ACTIVE_VISUALIZER_OPACITY : IDLE_VISUALIZER_OPACITY,
                  }}
                />
              )}
            </For>
          </div>
        </div>

        <div
          class={cx(
            'pomo-player__summary relative flex min-h-16 items-center',
            'gap-[var(--pomo-padding-md)] px-[var(--pomo-padding-sm)]',
            'py-[var(--pomo-padding-sm)]',
          )}
        >
          <media-play-button
            aria-label="재생 또는 일시 정지"
            aria-hidden={expanded() ? 'true' : undefined}
            class={cx(
              'pomo-player__play pomo-player__play--summary shrink-0',
              expanded() && 'is-hidden',
            )}
            disabled={!currentTrack()}
            tabindex={expanded() ? -1 : 0}
          >
            <span aria-hidden="true" class="i-tabler-player-play size-5" slot="play" />
            <span aria-hidden="true" class="i-tabler-player-pause size-5" slot="pause" />
          </media-play-button>

          <div class="pomo-player__title relative min-w-0 flex-1 px-[var(--pomo-padding-sm)]">
            <p class="pomo-player__track-title m-0 truncate">
              {currentTrack()?.title ?? '집중 음악을 준비 중이에요'}
            </p>
            <p class="pomo-player__track-artist mb-0 mt-0.5 truncate">
              {currentTrack()?.artist ?? 'MP3를 연결하면 이곳에서 재생돼요'}
            </p>
          </div>

          <button
            aria-expanded={expanded()}
            aria-label={expanded() ? '플레이어 접기' : '플레이어 펼치기'}
            class={
              'relative grid size-9 shrink-0 place-items-center rounded-full transition ' +
              'pomo-player__utility hover:bg-[var(--pomo-secondary-soft)] ' +
              'text-[var(--pomo-text-muted)] hover:text-[var(--pomo-text)]'
            }
            onClick={toggleExpanded}
            type="button"
          >
            <span
              aria-hidden="true"
              class={cx('size-4', expanded() ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up')}
            />
          </button>
        </div>

        <Show when={expanded()}>
          <div
            class={cx(
              'pomo-player__expanded relative px-[var(--pomo-padding-sm)]',
              'pb-[var(--pomo-padding-sm)] pt-[var(--pomo-padding-md)]',
              'rounded-b-[calc(var(--pomo-radius-panel)-0.5rem)]',
            )}
          >
            <div class="mb-[var(--pomo-padding-md)] px-[var(--pomo-padding-xs)]">
              <media-time-range class={MEDIA_FOCUS_CLASSES} />
              <div
                class={cx(
                  'mt-[var(--pomo-padding-xs)] flex justify-end text-[10px]',
                  'tabular-nums text-[var(--pomo-text-muted)]',
                )}
              >
                <media-time-display class={MEDIA_FOCUS_CLASSES} showduration="" />
              </div>
            </div>

            <div
              class={cx(
                'grid grid-cols-[1fr_auto_1fr] items-center gap-[var(--pomo-padding-sm)]',
                'px-[var(--pomo-padding-xs)]',
              )}
            >
              <PPlaybackModes
                onRepeatModeChange={toggleRepeatMode}
                onShuffleChange={toggleShuffle}
                repeatMode={repeatMode()}
                shuffleEnabled={shuffleEnabled()}
              />

              <div class="flex items-center justify-center gap-[var(--pomo-padding-xs)]">
                <button
                  aria-label="이전 곡"
                  class={SKIP_BUTTON_CLASSES}
                  disabled={tracks().length < 2}
                  onClick={selectPreviousTrack}
                  type="button"
                >
                  <span aria-hidden="true" class="i-tabler-player-track-prev size-4" />
                </button>
                <media-play-button
                  aria-label="재생 또는 일시 정지"
                  class="pomo-player__play pomo-player__play--large max-[28rem]:size-12"
                  disabled={!currentTrack()}
                  notooltip
                >
                  <span aria-hidden="true" class="i-tabler-player-play size-5" slot="play" />
                  <span aria-hidden="true" class="i-tabler-player-pause size-5" slot="pause" />
                </media-play-button>
                <button
                  aria-label="다음 곡"
                  class={SKIP_BUTTON_CLASSES}
                  disabled={tracks().length < 2}
                  onClick={selectNextTrack}
                  type="button"
                >
                  <span aria-hidden="true" class="i-tabler-player-track-next size-4" />
                </button>
              </div>

              <div class="flex min-w-0 items-center justify-end gap-1">
                <media-mute-button aria-label="음소거">
                  <span aria-hidden="true" class="i-tabler-volume-off size-5" slot="off" />
                  <span aria-hidden="true" class="i-tabler-volume-4 size-5" slot="low" />
                  <span aria-hidden="true" class="i-tabler-volume-2 size-5" slot="medium" />
                  <span aria-hidden="true" class="i-tabler-volume size-5" slot="high" />
                </media-mute-button>
                <media-volume-range aria-label="음량" />
              </div>
            </div>

            <PTrackList
              currentIndex={currentIndex()}
              onTrackSelect={selectChosenTrack}
              tracks={tracks()}
            />
          </div>
        </Show>
      </media-controller>
    </div>
  )
}
