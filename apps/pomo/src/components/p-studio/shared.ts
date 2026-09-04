import {cx} from 'class-variance-authority'
import {type ScenePeriod} from '../../features/focus-room-time/index'

export const CLASSES = {
  entry: cx(
    'pomo-entry absolute inset-0 flex items-end',
    'text-[#fff9f1]',
    '[&[data-exiting]]:animate-entry-reveal-room',
    '[&[data-exiting]]:pointer-events-none',
    'motion-reduce:[&[data-exiting]]:[animation-duration:1ms]',
  ),
  entryAction: cx(
    'pomo-entry__action [button&]:min-w-[min(17rem,_100%)] [button&]:min-h-14',
    '[button&]:[padding-inline:1.5rem] [button&]:text-[0.9375rem]',
  ),
  entryContent: cx(
    'pomo-entry__content flex w-[min(calc(100%_-_2rem_-_var(--pomo-safe-area-inset-left)),_22rem)]',
    'box-border flex-col items-start gap-4',
    '[margin-block-end:calc(9rem_+_var(--pomo-safe-area-inset-bottom))]',
    '[margin-inline-start:calc(1rem_+_var(--pomo-safe-area-inset-left))]',
    'lg:[margin-block-end:calc(2.5rem_+_var(--pomo-safe-area-inset-bottom))]',
    'lg:[margin-inline-start:calc(2.5rem_+_var(--pomo-safe-area-inset-left))]',
  ),
  entryLeadingImage: cx(
    'size-16 [margin-block:-1.25rem] [margin-inline-start:-0.75rem]',
    '[filter:drop-shadow(0_0.125rem_0.1875rem_rgb(0_0_0_/_32%))]',
  ),
  mediaControls: cx(
    'pomo-media-controls flex w-full min-h-0 max-h-full [flex:0_1_auto]',
    'flex-col-reverse items-end justify-start gap-3',
    'pointer-events-none',
    '[&_.pomo-player-stage]:mr-auto',
    '[&_>_*]:pointer-events-auto',
    'sm:flex-row-reverse sm:flex-wrap-reverse sm:items-start',
  ),
  mediaDock: cx(
    'pomo-media-dock [--pomo-player-compact-width:7.75rem] absolute min-h-0',
    'top-[calc(5.25rem_+_var(--pomo-safe-area-inset-top))]',
    'right-safe-right-mobile bottom-safe-bottom-mobile left-safe-left-mobile flex',
    'flex-col items-end justify-end pointer-events-none gap-3',
    '[&_.pomo-player-stage]:relative [&_.pomo-player-stage]:inset-[auto]',
    '[&_.pomo-player-stage]:w-[min(29rem,_100%)] [&_.pomo-player-stage]:min-h-0',
    '[&_.pomo-player-stage]:max-h-full [&_.pomo-player-stage]:[flex:0_1_auto]',
    '[&_.pomo-player-stage]:pointer-events-auto',
    '[&_.pomo-player-stage]:transition-[width_180ms_ease] [&_.pomo-dialogue-bubble]:w-full',
    '[&_.pomo-dialogue-bubble]:max-h-full [&_.pomo-dialogue-bubble]:[flex:0_1_auto]',
    '[&_.pomo-dialogue-bubble]:pointer-events-auto',
    '[&:has(.pomo-media-messages:not(:empty))_.pomo-dialogue-composer:not([data-expanded])]:absolute',
    '[&:has(.pomo-media-messages:not(:empty))_.pomo-dialogue-composer:not([data-expanded])]:bottom-0',
    '[&:has(.pomo-media-messages:not(:empty))_.pomo-dialogue-composer:not([data-expanded])]:right-0',
    // oxlint-disable-next-line eslint-js/max-len -- UnoCSS must extract the complete arbitrary-variant utility.
    '[&:has(.pomo-media-messages:not(:empty)):has(.pomo-dialogue-composer:not([data-expanded]))_.pomo-media-messages]:w-[min(36rem,_calc(100%_-_4rem))]',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player-stage]:w-[var(--pomo-player-compact-width)]',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player__summary]:justify-center',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player__play-summary-frame]:hidden',
    '[&[data-dialogue-active]:not([data-player-expanded])_[data-pomo-player-title]]:hidden',
    '[&[data-dialogue-active]:not([data-player-expanded])_[data-player-utility=album]]:hidden',
    '[&[data-player-expanded]_.pomo-player-stage]:[container-type:size]',
    '[&[data-player-expanded]_.pomo-player-stage]:h-[19.875rem]',
    '[&[data-player-expanded]_.pomo-player-stage]:max-h-[19.875rem]',
    'max-xs:[&[data-player-expanded]_.pomo-player-stage]:h-[22.75rem]',
    'max-xs:[&[data-player-expanded]_.pomo-player-stage]:max-h-[22.75rem]',
    'lg:top-[calc(5.75rem_+_var(--pomo-safe-area-inset-top))]',
    'lg:right-safe-right lg:bottom-safe-bottom lg:left-safe-left',
    'motion-reduce:[&_.pomo-player-stage]:transition-[none]',
  ),
  mediaMessages: cx(
    'pomo-media-messages flex w-[min(36rem,_100%)] min-h-0 max-h-full [flex:0_1_auto] flex-col self-start',
    'gap-3 overflow-hidden pointer-events-none [&_>_*]:pointer-events-auto',
  ),
  sceneControl: cx(
    'pomo-scene-control max-lg:[&.pomo-icon-button]:hidden',
    'max-lg:[&.pomo-icon-select]:hidden',
  ),
  sceneToolbar: cx(
    'pointer-events-auto absolute right-4 top-[calc(1rem+var(--pomo-safe-area-inset-top))]',
    'flex flex-col items-end gap-2 xs:right-7',
    'lg:top-[calc(1.5rem+var(--pomo-safe-area-inset-top))]',
  ),
  ui: 'pomo-ui pointer-events-none absolute inset-0',
} as const

export type SceneTime = ScenePeriod
