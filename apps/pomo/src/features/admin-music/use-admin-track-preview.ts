import {useAction, useSubmission} from '@solidjs/router'
import {createSignal} from 'solid-js'

import type {AdminTrackPlaybackAccess} from './track-playback-access'

import {requestAdminTrackPlaybackAction} from './actions'

const PLAYBACK_REFRESH_MARGIN_MS = 30_000

interface PlaybackRestoration {
  readonly time: number
  readonly playing: boolean
}

export interface UseAdminTrackPreviewProps {
  readonly trackId: string
}

export interface AdminTrackPreviewController {
  readonly cancelResume: () => void
  readonly errorMessage: () => string | null
  readonly loading: () => boolean
  readonly onPlaybackError: (time?: number, playing?: boolean) => void
  readonly preparePlayback: (time: number, playing: boolean, operation: 'play' | 'seek') => boolean
  readonly restorePlayback: (media: HTMLAudioElement) => void
  readonly onPlaybackReady: () => void
  readonly playbackUrl: () => string | null
  readonly startPlayback: () => Promise<void>
}

export const useAdminTrackPreview = (
  props: UseAdminTrackPreviewProps,
  now: () => number = Date.now,
): AdminTrackPreviewController => {
  const requestPlayback = useAction(requestAdminTrackPlaybackAction)
  const submission = useSubmission(
    requestAdminTrackPlaybackAction,
    (input) => input[0] === props.trackId,
  )
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [access, setAccess] = createSignal<AdminTrackPlaybackAccess | null>(null)
  const [refreshing, setRefreshing] = createSignal(false)
  let restoration: PlaybackRestoration | null = null
  let recovered = false

  const expiresSoon = () => {
    const playback = access()
    return playback !== null && Date.parse(playback.expiresAt) <= now() + PLAYBACK_REFRESH_MARGIN_MS
  }

  const failPlayback = () => {
    restoration = null
    setAccess(null)
    setErrorMessage('미리듣기를 불러오지 못했습니다. 다시 시도해 주세요.')
  }

  const startPlayback = async (): Promise<void> => {
    recovered = false
    restoration = null
    setErrorMessage(null)
    const result = await requestPlayback(props.trackId)
    submission.clear()
    if (result.status === 'granted') {
      setAccess(result)
      return
    }

    setErrorMessage('미리듣기를 불러오지 못했습니다.')
  }

  const refreshPlayback = async (): Promise<void> => {
    setRefreshing(true)
    const result = await requestPlayback(props.trackId)
    submission.clear()
    setRefreshing(false)
    if (
      result.status !== 'granted' ||
      Date.parse(result.expiresAt) <= now() + PLAYBACK_REFRESH_MARGIN_MS
    ) {
      failPlayback()
      return
    }
    setAccess(result)
  }

  const preparePlayback = (time: number, playing: boolean, operation: 'play' | 'seek'): boolean => {
    if (restoration !== null) {
      restoration = operation === 'seek' ? {...restoration, time} : {...restoration, playing}
      return false
    }
    if (!expiresSoon()) {
      return true
    }
    restoration = {playing, time}
    refreshPlayback().catch(() => {
      setRefreshing(false)
      failPlayback()
    })
    return false
  }

  const onPlaybackError = (time = 0, playing = false) => {
    if (refreshing()) {
      return
    }
    if (!recovered && expiresSoon()) {
      recovered = true
      restoration = {playing, time}
      refreshPlayback().catch(() => {
        setRefreshing(false)
        failPlayback()
      })
      return
    }
    failPlayback()
  }

  const restorePlayback = (media: HTMLAudioElement) => {
    const pending = restoration
    if (pending === null || refreshing()) {
      return
    }
    restoration = null
    media.currentTime = pending.time
    if (pending.playing) {
      media.play().catch(() => undefined)
    }
  }

  return {
    cancelResume: () => {
      if (restoration !== null) {
        restoration = {...restoration, playing: false}
      }
    },
    errorMessage,
    loading: () => submission.pending === true || refreshing(),
    onPlaybackError,
    onPlaybackReady: () => setErrorMessage(null),
    playbackUrl: () => access()?.url ?? null,
    preparePlayback,
    restorePlayback,
    startPlayback,
  }
}
