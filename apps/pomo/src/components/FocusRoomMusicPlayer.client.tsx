import 'media-chrome'
import './FocusRoomMusicPlayer.css'

import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, onCleanup, onMount, Show, untrack} from 'solid-js'

import {
  type FocusRoomTrack,
  loadFocusRoomTracks,
} from '../features/focus-room-audio/focus-room-playlist'
import {createInitialPlaybackState} from '../features/focus-room-audio/initial-playback-state'
import {type RepeatMode, resolveTrackEnd} from '../features/focus-room-audio/playback-policy'
import {createShuffleQueue} from '../features/focus-room-audio/shuffle-queue'
import {useFocusRoomAudioVisualizer} from '../features/focus-room-audio/use-focus-room-audio-visualizer'

const ACTIVE_VISUALIZER_OPACITY = 0.76
const IDLE_VISUALIZER_OPACITY = 0.34
const SKIP_BUTTON_CLASSES =
  'focus-room-player__skip grid size-10 shrink-0 place-items-center rounded-full transition disabled:opacity-35'

const REPEAT_MODES = [
  {icon: 'i-tabler-repeat', label: '전체 반복', value: 'repeat-all'},
  {icon: 'i-tabler-repeat-once', label: '한 곡 반복', value: 'repeat-one'},
] as const

interface FocusRoomMusicPlayerClientProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly tracks?: readonly FocusRoomTrack[]
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

// oxlint-disable-next-line eslint/max-lines-per-function -- Media Chrome's control tree is one semantic unit.
export default function FocusRoomMusicPlayerClient(props: FocusRoomMusicPlayerClientProps) {
  const initialTracks = untrack(() => props.tracks ?? [])
  const initialState = createInitialPlaybackState({trackCount: initialTracks.length})
  const [loadedTracks, setLoadedTracks] = createSignal<readonly FocusRoomTrack[]>(initialTracks)
  const tracks = () => props.tracks ?? loadedTracks()
  const [currentIndex, setCurrentIndex] = createSignal(initialState.currentIndex)
  const [internalExpanded, setInternalExpanded] = createSignal(false)
  const expanded = () => props.expanded ?? internalExpanded()
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>('repeat-all')
  const [shuffleEnabled, setShuffleEnabled] = createSignal(true)
  const visualizer = useFocusRoomAudioVisualizer()
  const currentTrack = createMemo(() => tracks()[currentIndex()])
  const playlistRequest = new AbortController()
  let audioElement: HTMLAudioElement | undefined
  let destroyed = false
  let shuffleQueue = initialState.queue
  let shuffleHistory: number[] = []

  const handleAudioError = (error?: unknown) => {
    if (isAbortError(error)) {
      return
    }

    if (destroyed) {
      return
    }

    setIsPlaying(false)
    visualizer.stop()
  }

  const selectTrack = (options: SelectTrackOptions) => {
    if (tracks().length === 0) {
      return
    }

    const shouldResume = options.shouldResume ?? isPlaying()
    setCurrentIndex((options.index + tracks().length) % tracks().length)
    queueMicrotask(() => {
      if (shouldResume) {
        audioElement?.play().catch(handleAudioError)
      }
    })
  }

  const handlePlay = () => {
    setIsPlaying(true)
    if (audioElement) {
      visualizer.start(audioElement)
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
    visualizer.stop()
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
    audioElement.play().catch(handleAudioError)
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
    if (props.tracks === undefined) {
      loadFocusRoomTracks({signal: playlistRequest.signal})
        // oxlint-disable-next-line solid/reactivity -- Completion must apply the user's latest shuffle choice.
        .then((nextTracks) => {
          if (!destroyed) {
            if (shuffleEnabled()) {
              const nextState = createInitialPlaybackState({trackCount: nextTracks.length})

              setCurrentIndex(nextState.currentIndex)
              shuffleQueue = nextState.queue
              shuffleHistory = []
            }
            setLoadedTracks(nextTracks)
          }
        })
        .catch((error: unknown) => {
          handleAudioError(error)
        })
    }

    audioElement?.addEventListener('play', handlePlay)
    audioElement?.addEventListener('pause', handlePause)
    audioElement?.addEventListener('ended', handleEnded)
    audioElement?.addEventListener('error', handleAudioError)
  })

  onCleanup(() => {
    destroyed = true
    playlistRequest.abort()
    audioElement?.removeEventListener('play', handlePlay)
    audioElement?.removeEventListener('pause', handlePause)
    audioElement?.removeEventListener('ended', handleEnded)
    audioElement?.removeEventListener('error', handleAudioError)
  })

  return (
    <div
      class={cx(
        'focus-room-player-stage absolute inset-x-4',
        'bottom-[calc(1rem+env(safe-area-inset-bottom))]',
        'sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[min(29rem,calc(100vw-3rem))]',
      )}
    >
      <media-controller
        audio=""
        class={cx(
          'focus-room-player focus-room-player-shell relative w-full overflow-hidden p-2',
          'rounded-[var(--focus-room-radius-panel)]',
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
          class="focus-room-player__base focus-room-backdrop pointer-events-none absolute inset-0"
        />

        <div
          class={cx(
            'focus-room-player__visualizer-frame pointer-events-none absolute',
            'inset-x-0 top-0 overflow-hidden',
            expanded() ? 'h-18' : 'bottom-0',
          )}
        >
          <div
            aria-label="오디오 주파수 레벨"
            class="focus-room-player__visualizer absolute flex items-end gap-0.5"
          >
            <For each={visualizer.levels()}>
              {(level) => (
                <span
                  aria-hidden="true"
                  class={cx(
                    'focus-room-level min-w-0 flex-1 rounded-t-full',
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

        <div class="focus-room-player__summary relative flex min-h-16 items-center gap-3 px-2">
          <media-play-button
            aria-label="재생 또는 일시 정지"
            aria-hidden={expanded() ? 'true' : undefined}
            class={cx(
              'focus-room-player__play focus-room-player__play--summary shrink-0',
              expanded() && 'is-hidden',
            )}
            disabled={!currentTrack()}
            tabindex={expanded() ? -1 : 0}
          >
            <span aria-hidden="true" class="i-tabler-player-play size-5" slot="play" />
            <span aria-hidden="true" class="i-tabler-player-pause size-5" slot="pause" />
          </media-play-button>

          <div class="focus-room-player__title relative min-w-0 flex-1 px-2">
            <p class="focus-room-player__track-title m-0 truncate">
              {currentTrack()?.title ?? '집중 음악을 준비 중이에요'}
            </p>
            <p class="focus-room-player__track-artist mb-0 mt-0.5 truncate">
              {currentTrack()?.artist ?? 'MP3를 연결하면 이곳에서 재생돼요'}
            </p>
          </div>

          <button
            aria-expanded={expanded()}
            aria-label={expanded() ? '플레이어 접기' : '플레이어 펼치기'}
            class={
              'relative grid size-9 shrink-0 place-items-center rounded-full transition ' +
              'focus-room-player__utility hover:bg-[var(--focus-room-secondary-soft)] ' +
              'text-[var(--focus-room-text-muted)] hover:text-[var(--focus-room-text)]'
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
              'focus-room-player__expanded relative px-2 pb-2 pt-3',
              'rounded-b-[calc(var(--focus-room-radius-panel)-0.5rem)]',
            )}
          >
            <div class="mb-3 px-1">
              <media-time-range />
              <div class="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--focus-room-text-muted)]">
                <media-time-display />
                <media-time-display showduration="" />
              </div>
            </div>

            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1">
              <div class="focus-room-player__modes flex w-fit items-center gap-0.5 rounded-full p-1">
                <div class="contents" role="group" aria-label="반복 방식">
                  <For each={REPEAT_MODES}>
                    {(mode) => (
                      <button
                        aria-label={mode.label}
                        aria-pressed={repeatMode() === mode.value}
                        class={cx(
                          'focus-room-player__mode grid size-8 place-items-center rounded-full transition',
                          repeatMode() === mode.value && 'is-active',
                        )}
                        onClick={() => toggleRepeatMode(mode.value)}
                        title={mode.label}
                        type="button"
                      >
                        <span aria-hidden="true" class={cx(mode.icon, 'size-4')} />
                      </button>
                    )}
                  </For>
                </div>
                <span aria-hidden="true" class="mx-0.5 h-5 w-px bg-[var(--focus-room-border)]" />
                <button
                  aria-label="랜덤 재생"
                  aria-pressed={shuffleEnabled()}
                  class={cx(
                    'focus-room-player__mode grid size-8 place-items-center rounded-full transition',
                    shuffleEnabled() && 'is-active',
                  )}
                  onClick={toggleShuffle}
                  title="랜덤 재생"
                  type="button"
                >
                  <span aria-hidden="true" class="i-tabler-arrows-shuffle size-4" />
                </button>
              </div>

              <div class="flex items-center justify-center gap-1">
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
                  class="focus-room-player__play focus-room-player__play--large"
                  disabled={!currentTrack()}
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

            <Show when={tracks().length > 1}>
              <ol class="focus-room-player__playlist mb-0 mt-3 grid max-h-38 list-none gap-1 overflow-auto p-1">
                <For each={tracks()}>
                  {(track, index) => (
                    <li>
                      <button
                        aria-current={index() === currentIndex() ? 'true' : undefined}
                        class={cx(
                          'focus-room-player__track flex w-full items-center gap-3 rounded-3',
                          'px-3 py-2.5 text-left text-xs transition',
                          index() === currentIndex()
                            ? 'bg-[var(--focus-room-accent-soft)] text-[var(--focus-room-text)]'
                            : 'text-[var(--focus-room-text-muted)] hover:bg-[var(--focus-room-secondary-soft)]',
                        )}
                        onClick={() => selectChosenTrack(index())}
                        type="button"
                      >
                        <span class="w-4 text-center tabular-nums">{index() + 1}</span>
                        <span class="min-w-0 flex-1 truncate">{track.title}</span>
                        <span class="truncate opacity-70">{track.artist}</span>
                      </button>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
          </div>
        </Show>
      </media-controller>
    </div>
  )
}
