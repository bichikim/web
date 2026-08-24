import 'media-chrome'

import {cx} from 'class-variance-authority'
import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {z} from 'zod'

const PLAYER_CLASSES = cx(
  'block min-w-0 overflow-hidden rounded-3 border bg-black/18',
  '[--media-background-color:transparent] [--media-control-background:transparent]',
  '[--media-control-hover-background:rgb(255_250_241_/_8%)]',
  '[--media-control-padding:0.55rem] [--media-font-family:inherit]',
  '[--media-primary-color:#fffaf1] [--media-range-bar-color:#e8bc88]',
  '[--media-range-track-background:rgb(255_250_241_/_18%)]',
  '[--media-range-track-height:2px] [--media-secondary-color:transparent]',
)

const playbackResponseSchema = z.object({
  expiresAt: z.string().datetime(),
  url: z.string().url(),
})

export interface AdminTrackPreviewProps {
  readonly active?: boolean
  readonly onPlay?: () => void
  readonly title?: string
  readonly trackId: string
}

export const AdminTrackPreview = (props: AdminTrackPreviewProps) => {
  const [audioElement, setAudioElement] = createSignal<HTMLAudioElement>()
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [playbackUrl, setPlaybackUrl] = createSignal<string | null>(null)

  createEffect(() => {
    if (props.active !== true) {
      audioElement()?.pause()
    }
  })

  onCleanup(() => audioElement()?.pause())

  const handlePlaybackError = () => {
    audioElement()?.pause()
    setPlaybackUrl(null)
    setErrorMessage('미리듣기를 불러오지 못했습니다. 다시 시도해 주세요.')
  }

  const handleLoad = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `/api/admin/music/tracks/${encodeURIComponent(props.trackId)}/playback`,
      )

      if (!response.ok) {
        throw new Error(`Playback access failed with status ${response.status}`)
      }

      const playback = playbackResponseSchema.parse(await response.json())
      setPlaybackUrl(playback.url)
      await Promise.resolve()
      const audio = audioElement()

      if (audio === undefined) {
        throw new Error('Playback audio element is unavailable')
      }

      audio.load()
      await audio.play()
    } catch (error) {
      console.error('Failed to load admin track preview', error)
      setErrorMessage('미리듣기를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
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
            disabled={loading()}
            onClick={handleLoad}
            type="button"
          >
            <span aria-hidden="true" class="text-#e8bc88">
              ▶
            </span>
            {loading() ? '음원 불러오는 중…' : '미리듣기'}
          </button>
        }
        when={playbackUrl()}
      >
        {(url) => (
          <media-controller
            audio=""
            class={cx(PLAYER_CLASSES, props.active ? 'border-#e8bc88/45' : 'border-white/10')}
          >
            <audio
              onCanPlay={() => setErrorMessage(null)}
              onError={handlePlaybackError}
              onPlay={() => props.onPlay?.()}
              preload="metadata"
              ref={setAudioElement}
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
      <Show when={errorMessage()}>
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
