import 'media-chrome'

import {cx} from 'class-variance-authority'
import {createEffect, createSignal, onCleanup, Show} from 'solid-js'

import {useAdminTrackPreview} from '../../features/admin-music'

const PLAYER_CLASSES = cx(
  'block min-w-0 overflow-hidden rounded-3 border bg-black/18',
  '[--media-background-color:transparent] [--media-control-background:transparent]',
  '[--media-control-hover-background:rgb(255_250_241_/_8%)]',
  '[--media-control-padding:0.55rem] [--media-font-family:inherit]',
  '[--media-primary-color:#fffaf1] [--media-range-bar-color:#e8bc88]',
  '[--media-range-track-background:rgb(255_250_241_/_18%)]',
  '[--media-range-track-height:2px] [--media-secondary-color:transparent]',
)

export interface AdminTrackPreviewProps {
  readonly active?: boolean
  readonly onPlay?: () => void
  readonly title?: string
  readonly trackId: string
}

export const AdminTrackPreview = (props: AdminTrackPreviewProps) => {
  const [audioElement, setAudioElement] = createSignal<HTMLAudioElement>()
  const preview = useAdminTrackPreview(props)

  createEffect(() => {
    if (props.active !== true) {
      audioElement()?.pause()
    }
  })

  onCleanup(() => audioElement()?.pause())

  const handleLoad = () => {
    preview.startPlayback().catch(() => undefined)
  }

  const bindAudio = (element: HTMLAudioElement) => {
    setAudioElement(element)
    element.load()
    element.play().catch(() => undefined)
  }

  const handlePlaybackError = () => {
    audioElement()?.pause()
    preview.onPlaybackError()
  }

  return (
    <div class="min-w-0">
      <Show
        fallback={
          <button
            aria-label={`${props.title ?? '수록곡'} 미리듣기`}
            class={cx(
              PLAYER_CLASSES,
              'flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white/70',
              'disabled:cursor-wait disabled:text-white/40',
            )}
            disabled={preview.loading()}
            onClick={handleLoad}
            type="button"
          >
            <span aria-hidden="true" class="text-#e8bc88">
              ▶
            </span>
            {preview.loading() ? '음원 불러오는 중…' : '미리듣기'}
          </button>
        }
        when={preview.playbackUrl()}
      >
        {(url) => (
          <media-controller
            audio=""
            class={cx(PLAYER_CLASSES, props.active ? 'border-#e8bc88/45' : 'border-white/10')}
          >
            <audio
              onCanPlay={() => preview.onPlaybackReady()}
              onError={handlePlaybackError}
              onPlay={() => props.onPlay?.()}
              preload="metadata"
              ref={bindAudio}
              slot="media"
              src={url()}
            />
            <media-control-bar class="flex w-full items-center bg-transparent">
              <media-play-button
                aria-label={`${props.title ?? '수록곡'} 재생 또는 일시정지`}
                class="size-10 shrink-0 rounded-full text-#e8bc88"
                notooltip
                title="재생 또는 일시정지"
              />
              <media-time-display class="shrink-0 text-xs text-white/55" showduration="" />
              <media-time-range
                aria-label={`${props.title ?? '수록곡'} 재생 위치`}
                class="min-w-18 grow"
                title="재생 위치"
              />
              <media-mute-button
                aria-label={`${props.title ?? '수록곡'} 음소거`}
                class="size-10 shrink-0 text-white/55"
                notooltip
                title="음소거 켜기/끄기"
              />
            </media-control-bar>
          </media-controller>
        )}
      </Show>
      <Show when={preview.errorMessage()}>
        {(message) => (
          <p class="mb-0 mt-1 text-xs text-#f0aaaa" role="status">
            {message()}
          </p>
        )}
      </Show>
    </div>
  )
}

export default AdminTrackPreview
