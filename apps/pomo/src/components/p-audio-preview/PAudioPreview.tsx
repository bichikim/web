import * as m from '@paraglide/message'
import {AudioPlayer} from '../audio-player'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'
import {PlaybackIcon} from '../audio-preview/PlaybackIcon'
import {MuteIcon} from '../audio-preview/MuteIcon'

const PREVIEW_CLASSES = cx(
  'min-w-0 overflow-hidden rounded-3 border border-border bg-content-surface',
  'text-foreground',
)

const CONTROL_BUTTON_CLASSES = cx(
  'grid size-10 shrink-0 cursor-pointer place-items-center border-0 bg-transparent',
  'text-highlight outline-none hover:bg-primary-soft focus-visible:shadow-focus',
)

const formatAudioPosition = (currentTime: number, duration: number) =>
  m.audio_preview_time({
    current: currentTime.toFixed(1),
    duration: duration.toFixed(1),
  })

export interface PAudioPreviewProps {
  readonly autoplay?: boolean
  readonly class?: string
  readonly loading?: boolean
  readonly onPauseRequest?: () => void
  readonly onBeforePlayback?: (
    time: number,
    playing: boolean,
    operation: 'play' | 'seek',
  ) => boolean
  readonly onLoadedMetadata?: JSX.EventHandlerUnion<HTMLAudioElement, Event>
  readonly onCanPlay?: JSX.EventHandlerUnion<HTMLAudioElement, Event>
  readonly onEnded?: JSX.EventHandlerUnion<HTMLAudioElement, Event>
  readonly onError?: JSX.EventHandlerUnion<HTMLAudioElement, Event>
  readonly onPause?: JSX.EventHandlerUnion<HTMLAudioElement, Event>
  readonly onPlay?: JSX.EventHandlerUnion<HTMLAudioElement, Event>
  readonly onRequest?: () => void
  readonly paused?: boolean
  readonly preload?: 'auto' | 'metadata' | 'none'
  readonly src?: string | null
  readonly title?: string
}

export const PAudioPreview = (props: PAudioPreviewProps) => {
  const title = () => props.title ?? m.audio_preview_default_title()

  return (
    <Show
      fallback={
        <button
          aria-label={`${title()} ${m.audio_preview_listen()}`}
          class={cx(
            PREVIEW_CLASSES,
            'flex h-10 w-full items-center gap-2 px-3 text-left text-sm',
            'disabled:cursor-wait disabled:text-muted-foreground',
            props.class,
          )}
          disabled={props.loading || props.onRequest === undefined}
          onClick={() => props.onRequest?.()}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-player-play size-4 text-highlight" />
          {props.loading ? m.audio_preview_loading() : m.audio_preview_listen()}
        </button>
      }
      when={props.src}
    >
      {(source) => (
        <AudioPlayer.Root
          autoplay={props.autoplay}
          onBeforePlayback={props.onBeforePlayback}
          onPauseRequest={props.onPauseRequest}
          paused={props.paused}
        >
          <div
            class={cx(
              PREVIEW_CLASSES,
              'grid h-10 w-full grid-cols-[2.5rem_auto_minmax(4rem,1fr)_2.5rem] items-center gap-2',
              props.class,
            )}
          >
            <AudioPlayer.Media
              class="hidden"
              onCanPlay={props.onCanPlay}
              onEnded={props.onEnded}
              onError={props.onError}
              onLoadedMetadata={props.onLoadedMetadata}
              onPause={props.onPause}
              onPlay={props.onPlay}
              preload={props.preload ?? 'metadata'}
              src={source()}
            />
            <AudioPlayer.PlayButton
              class={CONTROL_BUTTON_CLASSES}
              pauseLabel={m.audio_preview_pause({title: title()})}
              playLabel={m.audio_preview_play({title: title()})}
            >
              <PlaybackIcon />
            </AudioPlayer.PlayButton>
            <span class="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">
              <AudioPlayer.Time /> / <AudioPlayer.Time kind="duration" />
            </span>
            <AudioPlayer.TimeRange
              aria-label={m.audio_preview_position({title: title()})}
              class="min-w-0 w-full cursor-pointer accent-highlight disabled:cursor-not-allowed"
              formatValueText={formatAudioPosition}
            />
            <AudioPlayer.MuteButton
              class={cx(CONTROL_BUTTON_CLASSES, 'text-muted-foreground')}
              muteLabel={m.audio_preview_mute({title: title()})}
              unmuteLabel={m.audio_preview_unmute({title: title()})}
            >
              <MuteIcon />
            </AudioPlayer.MuteButton>
          </div>
        </AudioPlayer.Root>
      )}
    </Show>
  )
}
