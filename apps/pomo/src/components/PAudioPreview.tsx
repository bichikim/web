import {AudioPlayer, useAudioPlayer} from '@winter-love/solid-components'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const PREVIEW_CLASSES = cx(
  'min-w-0 overflow-hidden rounded-3 border border-white/10 bg-black/18',
  'text-white/70',
)
const CONTROL_BUTTON_CLASSES = cx(
  'grid size-10 shrink-0 cursor-pointer place-items-center border-0 bg-transparent',
  'text-#e8bc88 outline-none hover:bg-white/8 focus-visible:shadow-focus',
)
const formatAudioPosition = (currentTime: number, duration: number) =>
  `${currentTime.toFixed(1)}초 / ${duration.toFixed(1)}초`

export interface PAudioPreviewProps {
  readonly autoplay?: boolean
  readonly class?: string
  readonly loading?: boolean
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

const PlaybackIcon = () => {
  const [state] = useAudioPlayer()

  return (
    <span
      aria-hidden="true"
      class={state().paused ? 'i-tabler-player-play size-4' : 'i-tabler-player-pause size-4'}
    />
  )
}

const MuteIcon = () => {
  const [state] = useAudioPlayer()

  return (
    <span
      aria-hidden="true"
      class={state().muted ? 'i-tabler-volume-off size-4' : 'i-tabler-volume size-4'}
    />
  )
}

export const PAudioPreview = (props: PAudioPreviewProps) => {
  const title = () => props.title ?? '오디오'

  return (
    <Show
      fallback={
        <button
          aria-label={`${title()} 미리 듣기`}
          class={cx(
            PREVIEW_CLASSES,
            'flex h-10 w-full items-center gap-2 px-3 text-left text-sm',
            'disabled:cursor-wait disabled:text-white/40',
            props.class,
          )}
          disabled={props.loading || props.onRequest === undefined}
          onClick={() => props.onRequest?.()}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-player-play size-4 text-#e8bc88" />
          {props.loading ? '음원 불러오는 중…' : '미리 듣기'}
        </button>
      }
      when={props.src}
    >
      {(source) => (
        <AudioPlayer.Root autoplay={props.autoplay} paused={props.paused}>
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
              onPause={props.onPause}
              onPlay={props.onPlay}
              preload={props.preload ?? 'metadata'}
              src={source()}
            />
            <AudioPlayer.PlayButton
              class={CONTROL_BUTTON_CLASSES}
              pauseLabel={`${title()} 일시정지`}
              playLabel={`${title()} 재생`}
            >
              <PlaybackIcon />
            </AudioPlayer.PlayButton>
            <span class="shrink-0 px-1 text-xs tabular-nums text-white/55">
              <AudioPlayer.Time /> / <AudioPlayer.Time kind="duration" />
            </span>
            <AudioPlayer.TimeRange
              aria-label={`${title()} 재생 위치`}
              class="min-w-0 w-full cursor-pointer accent-#e8bc88 disabled:cursor-not-allowed"
              formatValueText={formatAudioPosition}
            />
            <AudioPlayer.MuteButton
              class={cx(CONTROL_BUTTON_CLASSES, 'text-white/55')}
              muteLabel={`${title()} 음소거`}
              unmuteLabel={`${title()} 음소거 해제`}
            >
              <MuteIcon />
            </AudioPlayer.MuteButton>
          </div>
        </AudioPlayer.Root>
      )}
    </Show>
  )
}

export default PAudioPreview
