import {useAction, useSubmission} from '@solidjs/router'
import {createSignal} from 'solid-js'

import {requestAdminTrackPlaybackAction} from './actions'

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
  const requestPlayback = useAction(requestAdminTrackPlaybackAction)
  const submission = useSubmission(
    requestAdminTrackPlaybackAction,
    (input) => input[0] === props.trackId,
  )
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [playbackUrl, setPlaybackUrl] = createSignal<string | null>(null)

  const onPlaybackError = () => {
    setPlaybackUrl(null)
    setErrorMessage('미리듣기를 불러오지 못했습니다. 다시 시도해 주세요.')
  }

  const startPlayback = async (): Promise<void> => {
    setErrorMessage(null)
    const result = await requestPlayback(props.trackId)
    if (result.status === 'granted') {
      setPlaybackUrl(result.url)
      return
    }

    setErrorMessage('미리듣기를 불러오지 못했습니다.')
  }

  return {
    errorMessage,
    loading: () => submission.pending === true,
    onPlaybackError,
    onPlaybackReady: () => setErrorMessage(null),
    playbackUrl,
    startPlayback,
  }
}
