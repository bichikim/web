import {createSignal} from 'solid-js'
import {z} from 'zod'

const playbackResponseSchema = z.object({
  expiresAt: z.string().datetime(),
  url: z.string().url(),
})

export interface UseAdminTrackPreviewProps {
  readonly trackId: string
}

export interface AdminTrackPreviewController {
  readonly errorMessage: () => string | null
  readonly loading: () => boolean
  readonly onPlaybackError: () => void
  readonly onPlaybackReady: () => void
  readonly playbackUrl: () => string | null
  readonly startPlayback: () => Promise<void>
}

export const useAdminTrackPreview = (
  props: UseAdminTrackPreviewProps,
): AdminTrackPreviewController => {
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [playbackUrl, setPlaybackUrl] = createSignal<string | null>(null)

  const onPlaybackError = () => {
    setPlaybackUrl(null)
    setErrorMessage('미리듣기를 불러오지 못했습니다. 다시 시도해 주세요.')
  }

  const startPlayback = async (): Promise<void> => {
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
    } catch (error) {
      console.error('Failed to load admin track preview', error)
      setErrorMessage('미리듣기를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return {
    errorMessage,
    loading,
    onPlaybackError,
    onPlaybackReady: () => setErrorMessage(null),
    playbackUrl,
    startPlayback,
  }
}
