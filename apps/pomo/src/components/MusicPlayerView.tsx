import 'media-chrome'

import {cx} from 'class-variance-authority'
import {For, type JSX, Show} from 'solid-js'

import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import type {RepeatMode} from '../features/focus-room-audio/playback-policy'
import {PPlaybackModes} from './PPlaybackModes'
import {PTrackList} from './PTrackList'

const CLASSES = {
  level: [
    'pomo-level bg-[var(--pomo-accent)] shadow-[0_0_0.7rem_rgb(216_104_69_/_42%)]',
    'origin-[center_bottom] motion-reduce:transition-[none]',
  ].join(' '),
  player: [
    'pomo-player [--media-background-color:transparent] [--media-control-background:transparent]',
    '[--media-control-hover-background:var(--pomo-secondary-soft)]',
    '[--media-control-padding:0.6rem] [--media-font-family:inherit]',
    '[--media-primary-color:var(--pomo-text)] [--media-range-bar-color:var(--pomo-secondary)]',
    '[--media-range-track-height:0.2rem] [--media-secondary-color:transparent] block w-full',
    'bg-transparent [&_media-control-bar]:w-full [&_media-control-bar]:bg-transparent',
    '[&_media-play-button]:rounded-full [&_media-mute-button]:rounded-full',
    '[&_media-mute-button]:text-[var(--pomo-text-muted)]',
    '[&_media-mute-button:hover]:text-[var(--pomo-text)]',
    '[&_media-mute-button:hover]:bg-[rgb(255_250_241_/_8%)] [&_media-time-range]:w-full',
    '[&_media-time-range]:min-w-[7rem] [&_media-time-range]:h-4',
    '[&_media-volume-range]:w-[clamp(2.5rem,_8vw,_4.5rem)] [&_media-volume-range]:min-w-0',
  ].join(' '),
  playerBase: 'pomo-player__base bg-[var(--pomo-glass)]',
  playerExpanded: [
    'pomo-player__expanded isolate',
    'bg-[linear-gradient(_180deg,_rgb(0_0_0_/_2%)_0%,_rgb(0_0_0_/_10%)_34%,_rgb(0_0_0_/_18%)_100%_)]',
    'shadow-[inset_0_-1px_0_rgb(255_250_241_/_4%)]',
    'pomo-below-[28rem]:[&_>_div:nth-child(2)]:grid-cols-[auto_1fr]',
    'pomo-below-[28rem]:[&_>_div:nth-child(2)_>_div:last-child]:hidden',
  ].join(' '),
  playerPlay: [
    'pomo-player__play w-11 h-11 text-white bg-[var(--pomo-accent)]',
    'shadow-[0_8px_20px_rgb(125_49_29_/_34%),_inset_0_1px_0_rgb(255_255_255_/_24%)]',
    'transition-[transform_160ms_ease,_filter_160ms_ease] [&:hover]:filter-[brightness(1.08)]',
    '[&:hover]:transform-[translateY(-1px)] motion-reduce:transition-[none]',
  ].join(' '),
  playerPlayLarge: 'pomo-player__play--large w-13 h-13',
  playerPlaySummary: [
    'pomo-player__play--summary overflow-hidden',
    '[transition:var(--pomo-player-summary-transition)]',
    '[&.is-hidden]:w-0 [&.is-hidden]:h-0 [&.is-hidden]:[margin-right:-0.75rem]',
    '[&.is-hidden]:[opacity:0] [&.is-hidden]:pointer-events-none motion-reduce:transition-[none]',
  ].join(' '),
  playerShell: [
    'pomo-player-shell',
    'shadow-[0_22px_70px_rgb(5_4_3_/_46%),_inset_0_1px_0_rgb(255_255_255_/_10%)]',
  ].join(' '),
  playerTitle: 'pomo-player__title block text-[var(--pomo-text)]',
  playerTrackArtist: 'pomo-player__track-artist text-[#c9c0b5] text-[0.6875rem] leading-4',
  playerTrackTitle: [
    'pomo-player__track-title text-[#fffaf1] text-[0.9375rem] font-[750] leading-5',
    'tracking-[-0.01em]',
  ].join(' '),
  playerUtility: [
    'pomo-player__utility text-[var(--pomo-text-muted)]',
    '[&:focus-visible]:[outline:2px_solid_var(--pomo-accent)]',
    '[&:focus-visible]:[outline-offset:2px]',
  ].join(' '),
  playerVisualizer: [
    'pomo-player__visualizer top-[-8px] bottom-[-8px] left-[-8px] right-[-8px]',
    '[filter:blur(8px)_saturate(1.25)_contrast(1.12)]',
  ].join(' '),
} as const

// AI_NOTE - Keep transition in CSS so prefers-reduced-motion can override it.
const PLAYER_SUMMARY_STYLE: JSX.CSSProperties = {
  '--pomo-player-summary-transition': [
    'width 260ms ease, height 260ms ease, margin 260ms ease, ',
    'opacity 180ms ease, transform 160ms ease, filter 160ms ease',
  ].join(''),
}

const ACTIVE_VISUALIZER_OPACITY = 0.76
const IDLE_VISUALIZER_OPACITY = 0.34
const SKIP_BUTTON_CLASSES = [
  'pomo-player__skip grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 max-[28rem]:size-9',
].join(' ')
const MEDIA_FOCUS_CLASSES =
  'focus-visible:outline-none [--media-focus-box-shadow:inset_0_0_0_2px_var(--pomo-secondary)]'

interface MusicPlayerViewProps {
  readonly currentIndex: number
  readonly currentTrack?: PTrack
  readonly expanded: boolean
  readonly isPlaying: boolean
  readonly levels: readonly number[]
  readonly onAudioElement: (element: HTMLAudioElement) => void
  readonly onExpandedChange: () => void
  readonly onNextTrack: () => void
  readonly onPreviousTrack: () => void
  readonly onRepeatModeChange: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly onShuffleChange: () => void
  readonly onTrackSelect: (index: number) => void
  readonly repeatMode: RepeatMode
  readonly shuffleEnabled: boolean
  readonly tracks: readonly PTrack[]
}

type ExpandedPlayerControlsProps = Pick<
  MusicPlayerViewProps,
  | 'currentIndex'
  | 'currentTrack'
  | 'onNextTrack'
  | 'onPreviousTrack'
  | 'onRepeatModeChange'
  | 'onShuffleChange'
  | 'onTrackSelect'
  | 'repeatMode'
  | 'shuffleEnabled'
  | 'tracks'
>

const ExpandedPlayerControls = (props: ExpandedPlayerControlsProps) => (
  <div
    class={cx(
      CLASSES.playerExpanded,
      'relative px-[var(--pomo-padding-sm)] pb-[var(--pomo-padding-sm)]',
      'pt-[var(--pomo-padding-md)] rounded-b-[calc(var(--pomo-radius-panel)-0.5rem)]',
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
        onRepeatModeChange={props.onRepeatModeChange}
        onShuffleChange={props.onShuffleChange}
        repeatMode={props.repeatMode}
        shuffleEnabled={props.shuffleEnabled}
      />

      <div class="flex items-center justify-center gap-[var(--pomo-padding-xs)]">
        <button
          aria-label="이전 곡"
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onPreviousTrack()}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-player-track-prev size-4" />
        </button>
        <media-play-button
          aria-label="재생 또는 일시 정지"
          class={cx(CLASSES.playerPlay, CLASSES.playerPlayLarge, 'max-[28rem]:size-12')}
          disabled={!props.currentTrack}
          notooltip
        >
          <span aria-hidden="true" class="i-tabler-player-play size-5" slot="play" />
          <span aria-hidden="true" class="i-tabler-player-pause size-5" slot="pause" />
        </media-play-button>
        <button
          aria-label="다음 곡"
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onNextTrack()}
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
      currentIndex={props.currentIndex}
      onTrackSelect={props.onTrackSelect}
      tracks={props.tracks}
    />
  </div>
)

export const MusicPlayerView = (props: MusicPlayerViewProps) => (
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
        CLASSES.player,
        CLASSES.playerShell,
        'relative w-full overflow-hidden p-[var(--pomo-padding-sm)]',
        'rounded-[var(--pomo-radius-panel)]',
      )}
    >
      <audio
        crossorigin="anonymous"
        preload="metadata"
        ref={props.onAudioElement}
        slot="media"
        src={props.currentTrack?.source}
      />

      <div
        aria-hidden="true"
        class={cx(CLASSES.playerBase, 'pomo-backdrop pointer-events-none absolute inset-0')}
      />

      <div
        class={cx(
          'pomo-player__visualizer-frame pointer-events-none absolute inset-x-0 top-0',
          'overflow-hidden',
          props.expanded ? 'h-18' : 'bottom-0',
        )}
      >
        <div
          aria-label="오디오 주파수 레벨"
          class={cx(CLASSES.playerVisualizer, 'absolute flex items-end gap-0.5')}
        >
          <For each={props.levels}>
            {(level) => (
              <span
                aria-hidden="true"
                class={cx(
                  CLASSES.level,
                  'min-w-0 flex-1 rounded-t-full transition-[height,opacity] duration-75',
                )}
                style={{
                  height: `${level}%`,
                  opacity: props.isPlaying ? ACTIVE_VISUALIZER_OPACITY : IDLE_VISUALIZER_OPACITY,
                }}
              />
            )}
          </For>
        </div>
      </div>

      <div
        class={cx(
          'pomo-player__summary relative flex min-h-16 items-center',
          'gap-[var(--pomo-padding-md)] px-[var(--pomo-padding-sm)] py-[var(--pomo-padding-sm)]',
        )}
      >
        <media-play-button
          aria-label="재생 또는 일시 정지"
          aria-hidden={props.expanded ? 'true' : undefined}
          class={cx(
            CLASSES.playerPlay,
            CLASSES.playerPlaySummary,
            'shrink-0',
            props.expanded && 'is-hidden',
          )}
          disabled={!props.currentTrack}
          style={PLAYER_SUMMARY_STYLE}
          tabindex={props.expanded ? -1 : 0}
        >
          <span aria-hidden="true" class="i-tabler-player-play size-5" slot="play" />
          <span aria-hidden="true" class="i-tabler-player-pause size-5" slot="pause" />
        </media-play-button>

        <div class={cx(CLASSES.playerTitle, 'relative min-w-0 flex-1 px-[var(--pomo-padding-sm)]')}>
          <p class={cx(CLASSES.playerTrackTitle, 'm-0 truncate')}>
            {props.currentTrack?.title ?? '집중 음악을 준비 중이에요'}
          </p>
          <p class={cx(CLASSES.playerTrackArtist, 'mb-0 mt-0.5 truncate')}>
            {props.currentTrack?.artist ?? 'MP3를 연결하면 이곳에서 재생돼요'}
          </p>
        </div>

        <button
          aria-expanded={props.expanded}
          aria-label={props.expanded ? '플레이어 접기' : '플레이어 펼치기'}
          class={cx(
            CLASSES.playerUtility,
            'relative grid size-9 shrink-0 place-items-center rounded-full transition',
            'text-[var(--pomo-text-muted)] hover:bg-[var(--pomo-secondary-soft)]',
            'hover:text-[var(--pomo-text)]',
          )}
          onClick={() => props.onExpandedChange()}
          type="button"
        >
          <span
            aria-hidden="true"
            class={cx('size-4', props.expanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up')}
          />
        </button>
      </div>

      <Show when={props.expanded}>
        <ExpandedPlayerControls
          currentIndex={props.currentIndex}
          currentTrack={props.currentTrack}
          onNextTrack={props.onNextTrack}
          onPreviousTrack={props.onPreviousTrack}
          onRepeatModeChange={props.onRepeatModeChange}
          onShuffleChange={props.onShuffleChange}
          onTrackSelect={props.onTrackSelect}
          repeatMode={props.repeatMode}
          shuffleEnabled={props.shuffleEnabled}
          tracks={props.tracks}
        />
      </Show>
    </media-controller>
  </div>
)
