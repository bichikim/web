import 'media-chrome'

import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import {getPomoIconClass} from '../design-system/icon-style'
import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import type {RepeatMode} from '../features/focus-room-audio/playback-policy'
import type {PSceneStyle} from '../features/focus-room-animation'
import {POverflowMarquee} from './POverflowMarquee'
import {PAlbumLibrary} from './PAlbumLibrary'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'
import {PPlaybackModes} from './PPlaybackModes'
import {PScribbleCircleControl} from './PScribbleCircleControl'
import {PScribbleFrame, SCRIBBLE_MASK_IMAGE} from './PScribbleFrame'
import {PTrackList} from './PTrackList'

const CLASSES = {
  level: [
    'pomo-level bg-primary shadow-[0_0_0.7rem_rgb(216_104_69_/_42%)]',
    'origin-[center_bottom] motion-reduce:transition-[none]',
  ].join(' '),
  player: [
    'pomo-player [--pomo-player-summary-space:4.75rem]',
    '[container-name:pomo-player] [container-type:inline-size]',
    '[--media-background-color:transparent] [--media-control-background:transparent]',
    '[--media-control-hover-background:rgb(114_123_96_/_20%)]',
    '[--media-control-padding:0.6rem] [--media-font-family:inherit]',
    '[--media-primary-color:#fffaf1] [--media-range-bar-color:#fffaf1]',
    '[--media-range-track-background:rgb(255_250_241_/_22%)]',
    '[--media-range-track-height:2px] [--media-secondary-color:transparent]',
    'flex min-h-0 max-h-full w-full flex-col',
    'bg-transparent [&_media-control-bar]:w-full [&_media-control-bar]:bg-transparent',
    '[&_media-play-button]:rounded-full [&_media-mute-button]:rounded-full',
    '[&_media-mute-button]:text-muted-foreground',
    '[&_media-mute-button:hover]:text-foreground',
    '[&_media-mute-button:hover]:bg-[rgb(255_250_241_/_8%)]',
  ].join(' '),
  playerBase: 'pomo-player__base bg-surface',
  playerExpanded: [
    'pomo-player__expanded isolate flex min-h-0 min-w-0 w-full flex-1 flex-col box-border',
    'bg-[linear-gradient(_180deg,_rgb(0_0_0_/_2%)_0%,_rgb(0_0_0_/_10%)_34%,_rgb(0_0_0_/_18%)_100%_)]',
    'shadow-[inset_0_-1px_0_rgb(255_250_241_/_4%)]',
  ].join(' '),
  playerExpandedFrame: [
    'pomo-player__expanded-frame grid min-h-0 min-w-0 flex-1 grid-rows-[0fr]',
    'overflow-hidden',
    '[transition:grid-template-rows_280ms_cubic-bezier(0.22,_1,_0.36,_1)]',
    '[&.is-expanded]:h-[calc(100cqh_-_var(--pomo-player-summary-space))]',
    '[&.is-expanded]:flex-none [&.is-expanded]:grid-rows-[1fr]',
    'motion-reduce:transition-none',
  ].join(' '),
  playerExpandedInner: [
    'pomo-player__expanded-inner flex min-h-0 min-w-0 w-full flex-col',
    'overflow-x-clip overflow-y-auto overscroll-contain',
    '[scrollbar-color:rgb(255_250_241_/_18%)_transparent] [scrollbar-width:thin]',
    'opacity-0 pointer-events-none',
    '[transition:opacity_160ms_ease]',
    '[&.is-expanded]:opacity-100 [&.is-expanded]:pointer-events-auto',
    'motion-reduce:transition-none',
  ].join(' '),
  playerMute: [
    'pomo-player__mute size-10 shrink-0 [--media-control-padding:0.625rem]',
    'player-compact:size-9 player-compact:[--media-control-padding:0.5rem]',
  ].join(' '),
  playerPlay: [
    'pomo-player__play w-11 h-11 text-white bg-primary',
    'shadow-[0_8px_20px_rgb(125_49_29_/_34%),_inset_0_1px_0_rgb(255_255_255_/_24%)]',
    '[transition:filter_160ms_ease] [&:hover]:brightness-[1.08]',
    'motion-reduce:transition-none',
  ].join(' '),
  playerPlayLarge: [
    'pomo-player__play--large w-13 h-13',
    '[transition:transform_160ms_ease,_filter_160ms_ease] [&:hover]:translate-y-[-1px]',
    'motion-reduce:transition-none',
  ].join(' '),
  playerPlaySummary: 'pomo-player__play--summary',
  playerPlaySummaryFrame: [
    'pomo-player__play-summary-frame h-11 w-11 shrink-0 overflow-visible',
    '[transition:width_260ms_ease,_margin-right_260ms_ease,_opacity_180ms_ease]',
    '[&.is-hidden]:w-0 [&.is-hidden]:[margin-right:-0.75rem]',
    '[&.is-hidden]:overflow-hidden [&.is-hidden]:opacity-0 [&.is-hidden]:pointer-events-none',
    'motion-reduce:transition-none',
  ].join(' '),
  playerProgress: [
    'pomo-player__progress flex min-w-0',
    '[--media-control-background:transparent] [--media-control-hover-background:transparent]',
    '[--media-range-thumb-opacity:0]',
    '[--media-range-thumb-transition:opacity_140ms_ease]',
    'motion-reduce:[--media-range-thumb-transition:none]',
  ].join(' '),
  playerProgressCollapsed: [
    'pomo-player__progress--collapsed pointer-events-none absolute inset-0 h-full w-full',
    '[--media-control-height:100%] [--media-range-padding:0px]',
    '[--media-range-track-height:100%] [--media-range-track-border-radius:0px]',
    '[--media-range-bar-color:rgb(0_0_0_/_25%)]',
    '[--media-time-range-buffered-color:transparent]',
    '[--media-range-track-background:transparent]',
    '[transition:opacity_160ms_ease] [&.is-hidden]:opacity-0',
    'motion-reduce:transition-none',
  ].join(' '),
  playerProgressExpanded: [
    'pomo-player__progress--expanded -mx-2 h-0 w-[calc(100%+1rem)] flex-none',
    'overflow-visible opacity-0 transition-[height,opacity]',
    '[&.is-expanded]:h-0.5 [&.is-expanded]:opacity-100',
    'motion-reduce:transition-none',
    '[--media-control-height:2px] [--media-range-padding:0px]',
    '[--media-range-bar-color:#fffaf1]',
    '[--media-time-range-buffered-color:rgb(255_250_241_/_40%)]',
    '[--media-range-track-background:rgb(255_250_241_/_22%)]',
    'hover:[--media-range-thumb-opacity:1] focus-within:[--media-range-thumb-opacity:1]',
  ].join(' '),
  playerShell: [
    'pomo-player-shell',
    'shadow-[0_22px_70px_rgb(5_4_3_/_46%),_inset_0_1px_0_rgb(255_255_255_/_10%)]',
  ].join(' '),
  playerSummary:
    'pomo-player__summary relative flex min-h-16 flex-none items-center gap-3 px-2 py-2',
  playerTitle: 'pomo-player__title block text-foreground',
  playerTrackArtist: 'pomo-player__track-artist text-[#c9c0b5] text-[0.6875rem] leading-4',
  playerTrackTitle: [
    'pomo-player__track-title text-[#fffaf1] text-[0.9375rem] font-[750] leading-5',
    'tracking-[-0.01em]',
  ].join(' '),
  playerVisualizer: [
    'pomo-player__visualizer top-[-8px] bottom-[-8px] left-[-8px] right-[-8px]',
    '[filter:blur(8px)_saturate(1.25)_contrast(1.12)]',
  ].join(' '),
  playerVolume: [
    'pomo-player__volume min-w-0 w-[clamp(3rem,_18cqi,_4.75rem)]',
    '[--media-range-padding-left:0.25rem] [--media-range-padding-right:0.25rem]',
    '[--media-range-thumb-opacity:0]',
    '[--media-range-thumb-transition:opacity_140ms_ease]',
    'hover:[--media-range-thumb-opacity:1] focus-within:[--media-range-thumb-opacity:1]',
    'motion-reduce:[--media-range-thumb-transition:none]',
  ].join(' '),
} as const

const ACTIVE_VISUALIZER_OPACITY = 0.76
const FALLBACK_TRACK_ARTIST = 'MP3를 연결하면 이곳에서 재생돼요'
const FALLBACK_TRACK_TITLE = '집중 음악을 준비 중이에요'
const IDLE_VISUALIZER_OPACITY = 0.34
const SKIP_BUTTON_CLASSES = [
  'pomo-player__skip grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 player-compact:size-9',
].join(' ')
const MEDIA_FOCUS_CLASSES =
  'focus-visible:outline-none [--media-focus-box-shadow:inset_0_0_0_2px_#727b60]'
const SCRIBBLE_MASK_CLASSES = [
  '[mask-image:var(--pomo-player-scribble-mask)]',
  '[-webkit-mask-image:var(--pomo-player-scribble-mask)]',
  '[mask-mode:alpha] [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]',
  '[-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat]',
  '[-webkit-mask-size:100%_100%]',
].join(' ')

const getShellClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? cx('rounded-none', SCRIBBLE_MASK_CLASSES) : 'rounded-panel'
const getBaseClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-transparent' : 'rounded-panel border-border'

interface PlayerIconProps {
  readonly icon: string
  readonly sceneStyle?: PSceneStyle
  readonly size: 'size-4' | 'size-5'
  readonly slot?: string
}

const PlayerIcon = (props: PlayerIconProps) => (
  <span
    aria-hidden="true"
    class={cx(getPomoIconClass(props.icon, props.sceneStyle), props.size)}
    slot={props.slot}
  />
)

interface MusicPlayerViewProps {
  readonly currentIndex: number
  readonly currentTrack?: PTrack
  readonly expanded: boolean
  readonly isPlaying: boolean
  readonly levels: readonly number[]
  readonly onAudioElement: (element: HTMLAudioElement) => void
  readonly onAlbumAdd?: (tracks: readonly PTrack[]) => void
  readonly onExpandedChange: () => void
  readonly onNextTrack: () => void
  readonly onPreviousTrack: () => void
  readonly onRepeatModeChange: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly onShuffleChange: () => void
  readonly onTrackRemove?: (index: number) => void
  readonly onTrackSelect: (index: number) => void
  readonly repeatMode: RepeatMode
  readonly sceneStyle?: PSceneStyle
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
  | 'onTrackRemove'
  | 'onTrackSelect'
  | 'repeatMode'
  | 'sceneStyle'
  | 'shuffleEnabled'
  | 'tracks'
>

const ExpandedPlayerControls = (props: ExpandedPlayerControlsProps) => (
  <div
    class={cx(
      CLASSES.playerExpanded,
      'relative px-2 pb-2',
      'pt-3 rounded-b-panel-inner player-compact:pt-2',
    )}
  >
    <div
      class={cx(
        'pomo-player__expanded-controls grid min-w-0 flex-none grid-cols-[1fr_auto_1fr]',
        'items-center gap-2 px-1',
        'player-compact:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
        'player-compact:gap-y-2 player-compact:px-0',
      )}
    >
      <div class="min-w-0 player-compact:col-start-1 player-compact:row-start-2">
        <PPlaybackModes
          onRepeatModeChange={props.onRepeatModeChange}
          onShuffleChange={props.onShuffleChange}
          repeatMode={props.repeatMode}
          sceneStyle={props.sceneStyle}
          shuffleEnabled={props.shuffleEnabled}
        />
      </div>

      <div
        class={cx(
          'pomo-player__transport flex items-center justify-center gap-1',
          'player-compact:col-span-2 player-compact:col-start-1 player-compact:row-start-1',
        )}
      >
        <button
          aria-label="이전 곡"
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onPreviousTrack()}
          title="이전 곡"
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-prev"
            sceneStyle={props.sceneStyle}
            size="size-4"
          />
        </button>
        <PScribbleCircleControl
          class="pomo-player__play-scribble-frame"
          enabled={props.sceneStyle === 'scribble'}
        >
          <media-play-button
            aria-label="재생 또는 일시 정지"
            class={cx(CLASSES.playerPlay, CLASSES.playerPlayLarge, 'player-compact:size-12')}
            disabled={!props.currentTrack}
            notooltip
            title="재생 또는 일시 정지"
          >
            <PlayerIcon
              icon="i-tabler-player-play"
              sceneStyle={props.sceneStyle}
              size="size-5"
              slot="play"
            />
            <PlayerIcon
              icon="i-tabler-player-pause"
              sceneStyle={props.sceneStyle}
              size="size-5"
              slot="pause"
            />
          </media-play-button>
        </PScribbleCircleControl>
        <button
          aria-label="다음 곡"
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onNextTrack()}
          title="다음 곡"
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-next"
            sceneStyle={props.sceneStyle}
            size="size-4"
          />
        </button>
      </div>

      <div
        class={cx(
          'pomo-player__volume-group flex min-w-0 items-center justify-end gap-0',
          'player-compact:col-start-2 player-compact:row-start-2',
        )}
      >
        <media-mute-button
          aria-label="음소거"
          class={CLASSES.playerMute}
          notooltip
          title="음소거 켜기/끄기"
        >
          <PlayerIcon
            icon="i-tabler-volume-off"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="off"
          />
          <PlayerIcon
            icon="i-tabler-volume-4"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="low"
          />
          <PlayerIcon
            icon="i-tabler-volume-2"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="medium"
          />
          <PlayerIcon
            icon="i-tabler-volume"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="high"
          />
        </media-mute-button>
        <media-volume-range aria-label="음량 조절" class={CLASSES.playerVolume} title="음량 조절" />
      </div>
    </div>

    <PTrackList
      currentIndex={props.currentIndex}
      onTrackRemove={props.onTrackRemove}
      onTrackSelect={props.onTrackSelect}
      tracks={props.tracks}
    />
  </div>
)

const ExpandedPlayerProgress = (props: Pick<MusicPlayerViewProps, 'expanded'>) => (
  <media-time-range
    aria-hidden={props.expanded ? undefined : 'true'}
    aria-label="재생 위치 조절"
    class={cx(
      CLASSES.playerProgress,
      CLASSES.playerProgressExpanded,
      MEDIA_FOCUS_CLASSES,
      props.expanded && 'is-expanded',
    )}
    disabled={!props.expanded}
    title="재생 위치 조절"
  />
)

const SummaryPlayButton = (
  props: Pick<MusicPlayerViewProps, 'currentTrack' | 'expanded' | 'sceneStyle'>,
) => (
  <div
    aria-hidden={props.expanded ? 'true' : undefined}
    class={cx(CLASSES.playerPlaySummaryFrame, props.expanded && 'is-hidden')}
  >
    <PScribbleCircleControl
      class="pomo-player__play-scribble-frame"
      enabled={props.sceneStyle === 'scribble'}
    >
      <media-play-button
        aria-label="재생 또는 일시 정지"
        class={cx(CLASSES.playerPlay, CLASSES.playerPlaySummary, 'shrink-0')}
        disabled={props.expanded || !props.currentTrack}
        notooltip
        tabindex={props.expanded ? -1 : 0}
        title="재생 또는 일시 정지"
      >
        <PlayerIcon
          icon="i-tabler-player-play"
          sceneStyle={props.sceneStyle}
          size="size-5"
          slot="play"
        />
        <PlayerIcon
          icon="i-tabler-player-pause"
          sceneStyle={props.sceneStyle}
          size="size-5"
          slot="pause"
        />
      </media-play-button>
    </PScribbleCircleControl>
  </div>
)

export const MusicPlayerView = (props: MusicPlayerViewProps) => {
  const handleAlbumAdd = (tracks: readonly PTrack[]) => props.onAlbumAdd?.(tracks)

  return (
    <div
      class={cx(
        'pomo-player-stage absolute inset-x-4',
        'bottom-player-bottom-mobile',
        'xs:inset-x-auto xs:bottom-6 xs:left-6 xs:w-[min(29rem,calc(100vw-3rem))]',
      )}
    >
      <div
        class="pomo-player-frame relative w-full overflow-visible [&[data-expanded=true]]:h-full"
        data-expanded={props.expanded}
      >
        <media-controller
          audio=""
          class={cx(
            CLASSES.player,
            CLASSES.playerShell,
            'relative w-full px-2 pt-2 pb-0.5',
            props.expanded ? 'h-full overflow-visible' : 'overflow-hidden',
            getShellClasses(props.sceneStyle),
          )}
          style={{'--pomo-player-scribble-mask': SCRIBBLE_MASK_IMAGE}}
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
            class={cx(
              CLASSES.playerBase,
              'border border-solid backdrop-blur-surface pointer-events-none absolute inset-0',
              getBaseClasses(props.sceneStyle),
            )}
          />

          <div
            class={cx(
              'pomo-player__visualizer-frame pointer-events-none absolute inset-x-0 top-0',
              'overflow-hidden',
              props.expanded ? 'h-18 rounded-t-panel' : 'bottom-0 rounded-panel',
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
                      opacity: props.isPlaying
                        ? ACTIVE_VISUALIZER_OPACITY
                        : IDLE_VISUALIZER_OPACITY,
                    }}
                  />
                )}
              </For>
            </div>
          </div>

          <media-time-range
            aria-hidden="true"
            class={cx(
              CLASSES.playerProgress,
              CLASSES.playerProgressCollapsed,
              props.expanded && 'is-hidden',
            )}
            disabled={true}
          />

          <div class={CLASSES.playerSummary}>
            <SummaryPlayButton
              currentTrack={props.currentTrack}
              expanded={props.expanded}
              sceneStyle={props.sceneStyle}
            />

            <div
              class={cx(CLASSES.playerTitle, 'relative min-w-0 flex-1 px-2')}
              data-pomo-player-title=""
            >
              <p class={cx(CLASSES.playerTrackTitle, 'm-0 min-w-0')}>
                <POverflowMarquee text={props.currentTrack?.title ?? FALLBACK_TRACK_TITLE} />
              </p>
              <p class={cx(CLASSES.playerTrackArtist, 'mb-0 mt-0.5 min-w-0')}>
                <POverflowMarquee text={props.currentTrack?.artist ?? FALLBACK_TRACK_ARTIST} />
              </p>
            </div>

            <PAlbumLibrary
              onAddTracks={handleAlbumAdd}
              sceneStyle={props.sceneStyle}
              tracks={props.tracks}
            />

            <PPlayerUtilityButton
              accessibleLabel={props.expanded ? '플레이어 접기' : '플레이어 펼치기'}
              expanded={props.expanded}
              icon={getPomoIconClass(
                props.expanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up',
                props.sceneStyle,
              )}
              onPress={() => props.onExpandedChange()}
            />
          </div>

          <ExpandedPlayerProgress expanded={props.expanded} />

          <div
            aria-hidden={props.expanded ? undefined : 'true'}
            class={cx(CLASSES.playerExpandedFrame, props.expanded && 'is-expanded')}
            inert={!props.expanded}
          >
            <div class={cx(CLASSES.playerExpandedInner, props.expanded && 'is-expanded')}>
              <ExpandedPlayerControls
                currentIndex={props.currentIndex}
                currentTrack={props.currentTrack}
                onNextTrack={props.onNextTrack}
                onPreviousTrack={props.onPreviousTrack}
                onRepeatModeChange={props.onRepeatModeChange}
                onShuffleChange={props.onShuffleChange}
                onTrackRemove={props.onTrackRemove}
                onTrackSelect={props.onTrackSelect}
                repeatMode={props.repeatMode}
                sceneStyle={props.sceneStyle}
                shuffleEnabled={props.shuffleEnabled}
                tracks={props.tracks}
              />

              <div aria-hidden="true" class="h-1.5 flex-none" />
            </div>
          </div>
        </media-controller>
        <Show when={props.sceneStyle === 'scribble'}>
          <PScribbleFrame class="pomo-player__scribble-border" />
        </Show>
      </div>
    </div>
  )
}
