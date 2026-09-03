import {cx} from 'class-variance-authority'
import type {PSceneStyle} from '../../features/focus-room-animation/index'
import type {PTrack} from '../../features/focus-room-audio/focus-room-playlist'
import type {RepeatMode} from '../../features/focus-room-audio/playback-policy'

const PLAYER_VOLUME_RANGE_CLASSES = cx(
  '[--media-range-padding-left:0.25rem] [--media-range-padding-right:0.25rem]',
  '[--media-range-thumb-opacity:0]',
  '[--media-range-thumb-transition:opacity_140ms_ease]',
  'hover:[--media-range-thumb-opacity:1] focus-within:[--media-range-thumb-opacity:1]',
  'motion-reduce:[--media-range-thumb-transition:none]',
)

export const CLASSES = {
  level: cx(
    'pomo-level bg-primary shadow-[0_0_0.7rem_rgb(216_104_69_/_42%)]',
    'origin-[center_bottom] motion-reduce:transition-[none]',
  ),
  player: cx(
    'pomo-player [--pomo-player-summary-space:4.75rem]',
    '[container-name:pomo-player] [container-type:inline-size]',
    '[--media-background-color:transparent] [--media-control-background:transparent]',
    '[--media-control-hover-background:var(--pomo-color-secondary-soft)]',
    '[--media-control-padding:0.6rem] [--media-font-family:inherit]',
    '[--media-primary-color:var(--pomo-color-foreground)]',
    '[--media-range-bar-color:var(--pomo-color-foreground)]',
    '[--media-range-track-background:var(--pomo-color-range-track)]',
    '[--media-range-track-height:2px] [--media-secondary-color:transparent]',
    'flex min-h-0 max-h-full w-full flex-col',
    'bg-transparent [&_media-control-bar]:w-full [&_media-control-bar]:bg-transparent',
    '[&_media-play-button]:rounded-full [&_media-mute-button]:rounded-full',
    '[&_media-mute-button]:text-muted-foreground',
    '[&_media-mute-button:hover]:text-foreground',
    '[&_media-mute-button:hover]:bg-secondary-soft',
  ),
  playerBase: 'pomo-player__base bg-player-surface',
  playerExpanded: cx(
    'pomo-player__expanded isolate flex min-h-0 min-w-0 w-full flex-1 flex-col box-border',
    'bg-[var(--pomo-player-expanded-background)]',
    'shadow-[inset_0_-1px_0_rgb(255_250_241_/_4%)]',
  ),
  playerExpandedFrame: cx(
    'pomo-player__expanded-frame grid min-h-0 min-w-0 flex-1 grid-rows-[0fr]',
    'overflow-hidden',
    '[transition:grid-template-rows_280ms_cubic-bezier(0.22,_1,_0.36,_1)]',
    '[&.is-expanded]:h-[calc(100cqh_-_var(--pomo-player-summary-space))]',
    '[&.is-expanded]:flex-none [&.is-expanded]:grid-rows-[1fr]',
    'motion-reduce:transition-none',
  ),
  playerExpandedInner: cx(
    'pomo-player__expanded-inner flex min-h-0 min-w-0 w-full flex-col',
    'overflow-x-clip overflow-y-auto overscroll-contain',
    '[scrollbar-color:var(--pomo-color-player-scrollbar)_transparent] [scrollbar-width:thin]',
    'opacity-0 pointer-events-none',
    '[transition:opacity_160ms_ease]',
    '[&.is-expanded]:opacity-100 [&.is-expanded]:pointer-events-auto',
    'motion-reduce:transition-none',
  ),
  playerMute: cx(
    'pomo-player__mute size-10 shrink-0 [--media-control-padding:0.625rem]',
    'player-compact:size-9',
  ),
  playerPlay: cx(
    'pomo-player__play w-11 h-11 text-white bg-primary',
    'shadow-[0_8px_20px_rgb(125_49_29_/_34%),_inset_0_1px_0_rgb(255_255_255_/_24%)]',
    '[transition:filter_160ms_ease] [&:hover]:brightness-[1.08]',
    'motion-reduce:transition-none',
  ),
  playerPlayLarge: cx(
    'pomo-player__play--large w-13 h-13',
    '[transition:transform_160ms_ease,_filter_160ms_ease] [&:hover]:translate-y-[-1px]',
    'motion-reduce:transition-none',
  ),
  playerPlaySummary: 'pomo-player__play--summary',
  playerPlaySummaryFrame: 'pomo-player__play-summary-frame h-11 w-11 shrink-0 overflow-visible',
  playerProgress: cx(
    'pomo-player__progress flex min-w-0',
    '[--media-control-background:transparent] [--media-control-hover-background:transparent]',
    '[--media-range-thumb-opacity:0]',
    '[--media-range-thumb-transition:opacity_140ms_ease]',
    'motion-reduce:[--media-range-thumb-transition:none]',
  ),
  playerProgressCollapsed: cx(
    'pomo-player__progress--collapsed pointer-events-none cursor-default absolute inset-0 h-full w-full',
    '[--media-cursor:default]',
    '[--media-control-height:100%] [--media-range-padding:0px]',
    '[--media-range-track-height:100%] [--media-range-track-border-radius:0px]',
    '[--media-range-bar-color:var(--pomo-color-player-progress)]',
    '[--media-time-range-buffered-color:transparent]',
    '[--media-range-track-background:transparent]',
    '[transition:opacity_160ms_ease] [&.is-hidden]:opacity-0',
    'motion-reduce:transition-none',
  ),
  playerProgressExpanded: cx(
    'pomo-player__progress--expanded -mx-2 h-0 w-[calc(100%+1rem)] flex-none',
    'overflow-visible opacity-0 transition-[height,opacity]',
    '[&.is-expanded]:h-0.5 [&.is-expanded]:opacity-100',
    'motion-reduce:transition-none',
    '[--media-control-height:2px] [--media-range-padding:0px]',
    '[--media-range-bar-color:var(--pomo-color-foreground)]',
    '[--media-time-range-buffered-color:var(--pomo-color-muted-foreground)]',
    '[--media-range-track-background:var(--pomo-color-range-track)]',
    'hover:[--media-range-thumb-opacity:1] focus-within:[--media-range-thumb-opacity:1]',
  ),
  playerShell: 'pomo-player-shell shadow-player',
  playerSummary:
    'pomo-player__summary relative flex min-h-16 flex-none items-center gap-3 px-2 py-2 player-compact:gap-2',
  playerTitle: 'pomo-player__title block text-foreground',
  playerTrackArtist: 'pomo-player__track-artist text-muted-foreground text-sm leading-5',
  playerTrackTitle: cx(
    'pomo-player__track-title text-foreground text-lg font-[750] leading-6',
    'tracking-[-0.01em]',
  ),
  playerVisualizer: cx(
    'pomo-player__visualizer top-[-8px] bottom-[-8px] left-[-8px] right-[-8px]',
    '[filter:blur(8px)_saturate(1.25)_contrast(1.12)]',
  ),
  playerVolume: cx(
    'pomo-player__volume min-w-0 w-[clamp(3rem,_18cqi,_4.75rem)]',
    'player-compact:min-w-6 player-compact:w-[clamp(1.5rem,_8cqi,_2rem)]',
    PLAYER_VOLUME_RANGE_CLASSES,
  ),
  playerVolumePopover: cx(
    'pomo-player__volume-popover-range h-6 min-w-24 w-24',
    '[--media-control-padding:0]',
    PLAYER_VOLUME_RANGE_CLASSES,
  ),
} as const

export interface MusicPlayerViewProps {
  readonly currentIndex: number
  readonly currentTrack?: PTrack
  readonly expanded: boolean
  readonly isPlaying: boolean
  readonly levels: readonly number[]
  readonly onAudioElement: (element: HTMLAudioElement) => void
  readonly onAlbumAdd?: (tracks: readonly PTrack[]) => void
  readonly onAlbumClear?: () => void
  readonly onExpandedChange: () => void
  readonly onNextTrack: () => void
  readonly onPreviousTrack: () => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly onRepeatModeChange: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly onShuffleChange: () => void
  readonly onTrackRemove?: (index: number) => void
  readonly onTrackSelect: (index: number) => void
  readonly repeatMode: RepeatMode
  readonly sceneStyle?: PSceneStyle
  readonly shuffleEnabled: boolean
  readonly tracks: readonly PTrack[]
}
