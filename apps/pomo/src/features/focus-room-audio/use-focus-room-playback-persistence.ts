import type {Accessor} from 'solid-js'

import type {FocusRoomTrack} from './focus-room-playlist'
import {type FocusRoomPlaybackState, writeFocusRoomPlayback} from './playback-storage'

const PROGRESS_SAVE_INTERVAL_MILLISECONDS = 5_000

export interface UseFocusRoomPlaybackPersistenceProps {
  readonly currentTrack: Accessor<FocusRoomTrack | undefined>
  readonly getAudioElement: Accessor<HTMLAudioElement | undefined>
  readonly isPlaying: Accessor<boolean>
}

export interface FocusRoomPlaybackPersistence {
  readonly applyPendingPosition: () => FocusRoomPlaybackState | null
  readonly persistCurrentPlayback: () => void
  readonly persistPlaybackProgress: () => void
  readonly setPendingPosition: (state: FocusRoomPlaybackState | null) => void
  readonly writePlayback: (state: FocusRoomPlaybackState) => void
}

const writePlayback = (state: FocusRoomPlaybackState) => {
  writeFocusRoomPlayback(state).catch(() => undefined)
}

export const useFocusRoomPlaybackPersistence = (
  props: UseFocusRoomPlaybackPersistenceProps,
): FocusRoomPlaybackPersistence => {
  let pendingPosition: FocusRoomPlaybackState | null = null
  let lastProgressSavedAt = 0

  const setPendingPosition = (state: FocusRoomPlaybackState | null) => {
    pendingPosition = state
  }

  const persistCurrentPlayback = () => {
    // oxlint-disable-next-line solid/reactivity -- Called from media events to read their latest state.
    const track = props.currentTrack()
    const positionSeconds = props.getAudioElement()?.currentTime

    if (
      track === undefined ||
      positionSeconds === undefined ||
      !Number.isFinite(positionSeconds) ||
      pendingPosition?.trackId === track.id
    ) {
      return
    }

    writePlayback({
      isPlaying: props.isPlaying(),
      positionSeconds: Math.max(0, positionSeconds),
      trackId: track.id,
    })
  }

  const applyPendingPosition = () => {
    const playback = pendingPosition
    // oxlint-disable-next-line solid/reactivity -- Called after media source updates and metadata events.
    const track = props.currentTrack()
    const audioElement = props.getAudioElement()

    if (playback === null || track?.id !== playback.trackId || audioElement === undefined) {
      return null
    }

    const {duration} = audioElement
    const positionSeconds =
      Number.isFinite(duration) && duration > 0
        ? Math.min(playback.positionSeconds, duration)
        : playback.positionSeconds

    try {
      audioElement.currentTime = positionSeconds
      pendingPosition = null
      const restoredPlayback = {...playback, positionSeconds}
      writePlayback(restoredPlayback)
      return restoredPlayback
    } catch {
      // Metadata may not be ready yet; loadedmetadata will retry the restoration.
      return null
    }
  }

  const persistPlaybackProgress = () => {
    const currentTime = Date.now()

    if (currentTime - lastProgressSavedAt < PROGRESS_SAVE_INTERVAL_MILLISECONDS) {
      return
    }

    lastProgressSavedAt = currentTime
    persistCurrentPlayback()
  }

  return {
    applyPendingPosition,
    persistCurrentPlayback,
    persistPlaybackProgress,
    setPendingPosition,
    writePlayback,
  }
}
