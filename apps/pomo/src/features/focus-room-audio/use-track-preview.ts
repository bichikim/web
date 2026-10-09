import {createSignal, onCleanup} from 'solid-js'

import type {TrackPreviewSourceResult} from './track-preview-access'
import * as m from '@paraglide/message'

interface PStaticTrackPreviewRequest {
  readonly id: string
  readonly source: string
}

interface PResolvedTrackPreviewRequest {
  readonly id: string
  readonly loadSource: () => Promise<TrackPreviewSourceResult>
}

export type PTrackPreviewRequest = PResolvedTrackPreviewRequest | PStaticTrackPreviewRequest

interface UseTrackPreviewOptions {
  readonly onEnd?: () => void
  readonly onStart?: (stopPreview: () => void) => void
}

export const useTrackPreview = (options: UseTrackPreviewOptions) => {
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [pendingTrackId, setPendingTrackId] = createSignal<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = createSignal<string | null>(null)
  let audioElement: HTMLAudioElement | undefined
  let releaseSource: (() => void) | undefined
  let requestRevision = 0
  let sessionActive = false

  const resetAudio = () => {
    if (audioElement === undefined) {
      return
    }

    audioElement.pause()
    audioElement.currentTime = 0
    audioElement.removeAttribute('src')
    audioElement.load()
    releaseSource?.()
    releaseSource = undefined
  }

  const stopPreview = () => {
    requestRevision += 1
    resetAudio()
    setPendingTrackId(null)
    setPlayingTrackId(null)

    if (sessionActive) {
      sessionActive = false
      options.onEnd?.()
    }
  }

  const togglePreview = async (request: PTrackPreviewRequest): Promise<void> => {
    if (playingTrackId() === request.id || pendingTrackId() === request.id) {
      stopPreview()
      return
    }

    if (audioElement === undefined) {
      return
    }

    const revision = (requestRevision += 1)
    resetAudio()
    setErrorMessage(null)
    setPendingTrackId(request.id)
    setPlayingTrackId(request.id)

    if (!sessionActive) {
      sessionActive = true
      options.onStart?.(stopPreview)
    }

    try {
      const sourceResult =
        'source' in request
          ? ({ok: true, source: request.source} as const)
          : await request.loadSource()

      if (revision !== requestRevision) {
        sourceResult.ok && sourceResult.release?.()
        return
      }

      if (!sourceResult.ok) {
        setErrorMessage(m.album_preview_login_required())
        stopPreview()
        return
      }

      releaseSource = sourceResult.release
      audioElement.src = sourceResult.source
      await audioElement.play()
      if (revision === requestRevision) {
        setPendingTrackId(null)
      }
    } catch (error) {
      if (revision !== requestRevision) {
        return
      }

      console.error('Failed to play album track preview.', error)
      setErrorMessage(m.album_preview_failed())
      stopPreview()
    }
  }

  const handleEnded = () => stopPreview()
  const handleError = () => {
    if (playingTrackId() === null) {
      return
    }

    console.error(
      'Album track preview media failed.',
      JSON.stringify({
        errorCode: audioElement?.error?.code ?? null,
        networkState: audioElement?.networkState ?? null,
        readyState: audioElement?.readyState ?? null,
      }),
    )
    setErrorMessage(m.album_preview_failed())
    stopPreview()
  }

  onCleanup(stopPreview)

  return {
    errorMessage,
    handleEnded,
    handleError,
    pendingTrackId,
    playingTrackId,
    setAudioElement: (element: HTMLAudioElement) => {
      audioElement = element
    },
    togglePreview,
  }
}
