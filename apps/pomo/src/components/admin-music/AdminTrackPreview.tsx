import {createEffect, createSignal, type JSX, Show} from 'solid-js'

import {PAudioPreview} from '../PAudioPreview'
import {useAdminTrackPreview} from '../../features/admin-music'

export interface AdminTrackPreviewProps {
  readonly active?: boolean
  readonly autoplay?: boolean
  readonly onPlay?: () => void
  readonly onRequest?: () => void
  readonly title?: string
  readonly trackId: string
}

export const AdminTrackPreview = (props: AdminTrackPreviewProps) => {
  const [hasPlayed, setHasPlayed] = createSignal(false)
  const preview = useAdminTrackPreview(props)

  const handleLoad = () => {
    setHasPlayed(false)
    props.onRequest?.()
    preview.startPlayback().catch(() => undefined)
  }

  const handlePlaybackError: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    preview.onPlaybackError(event.currentTarget.currentTime, !event.currentTarget.paused)
  }

  const handleMetadata: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    preview.restorePlayback(event.currentTarget)
  }

  createEffect(() => {
    const playbackActive = props.active
    const autoplayEnabled = props.autoplay
    if (playbackActive === false || (playbackActive !== true && autoplayEnabled === false)) {
      preview.cancelResume()
    }
  })

  const handleBeforePlayback = (time: number, playing: boolean, operation: 'play' | 'seek') => {
    if (operation === 'play') {
      props.onRequest?.()
    }
    return preview.preparePlayback(time, playing, operation)
  }

  const handlePlay = () => {
    props.onPlay?.()
    setHasPlayed(true)
  }

  return (
    <div class="min-w-0">
      <PAudioPreview
        autoplay={props.autoplay !== false}
        class={props.active ? 'border-#e8bc88/45' : undefined}
        loading={preview.loading()}
        onBeforePlayback={handleBeforePlayback}
        onPauseRequest={preview.cancelResume}
        onLoadedMetadata={handleMetadata}
        onCanPlay={() => preview.onPlaybackReady()}
        onError={handlePlaybackError}
        onPlay={handlePlay}
        onRequest={handleLoad}
        paused={hasPlayed() && props.active === false}
        src={preview.playbackUrl()}
        title={props.title ?? '수록곡'}
      />
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
