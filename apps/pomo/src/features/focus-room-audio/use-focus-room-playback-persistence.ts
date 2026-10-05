import type {Accessor} from 'solid-js'

import type {PTrack} from './focus-room-playlist'
import {type PPlaybackState, writePPlayback} from './playback-storage'

const PROGRESS_SAVE_INTERVAL_MILLISECONDS = 5_000

export interface UsePPlaybackPersistenceProps {
  readonly currentTrack: Accessor<PTrack | undefined>
  readonly currentIndex?: Accessor<number>
  readonly currentQueueEntryId?: Accessor<string | undefined>
  readonly getAudioElement: Accessor<HTMLAudioElement | undefined>
  readonly isPlaying: Accessor<boolean>
}

export interface PPlaybackPersistence {
  readonly applyPendingPosition: () => PPlaybackState | null
  readonly persistCurrentPlayback: () => void
  readonly persistPlaybackError: () => void
  readonly persistPlaybackIntent: (isPlaying: boolean) => void
  readonly persistSeekedPlayback: () => void
  readonly persistStoppedPlayback: () => void
  readonly persistPlaybackProgress: () => void
  readonly setPendingPosition: (state: PPlaybackState | null) => void
  readonly writePlayback: (state: PPlaybackState) => void
}

const writeStoredPlayback = (state: PPlaybackState) => {
  writePPlayback(state).catch(() => undefined)
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Playback persistence coordinates restore, seek and stop lifecycles behind one consumer contract.
export const usePPlaybackPersistence = (
  props: UsePPlaybackPersistenceProps,
): PPlaybackPersistence => {
  let pendingPosition: PPlaybackState | null = null
  let lastProgressSavedAt = 0

  const writePlayback = (state: PPlaybackState) => {
    const trackIndex = state.trackIndex ?? props.currentIndex?.()
    const queueEntryId =
      state.queueEntryId ??
      (state.trackId === props.currentTrack()?.id ? props.currentQueueEntryId?.() : undefined)
    writeStoredPlayback({
      ...state,
      ...(queueEntryId === undefined ? {} : {queueEntryId}),
      ...(trackIndex === undefined ? {} : {trackIndex}),
    })
  }

  const setPendingPosition = (state: PPlaybackState | null) => {
    pendingPosition = state
  }

  const persistPlayback = (isPlaying: boolean, updatePendingIntent: boolean) => {
    // oxlint-disable-next-line solid/reactivity -- Called from media events to read their latest state.
    const track = props.currentTrack()

    if (track === undefined) {
      return
    }

    const pendingPlayback = pendingPosition
    const currentQueueEntryId = props.currentQueueEntryId?.()
    const pendingTargetsCurrentEntry =
      pendingPlayback?.queueEntryId === undefined ||
      currentQueueEntryId === undefined ||
      pendingPlayback.queueEntryId === currentQueueEntryId
    if (pendingPlayback?.trackId === track.id && pendingTargetsCurrentEntry) {
      const currentIndex = props.currentIndex?.()
      const indexedPendingPlayback =
        currentIndex !== undefined && pendingPlayback.trackIndex !== currentIndex
          ? {...pendingPlayback, trackIndex: currentIndex}
          : pendingPlayback
      const identifiedPendingPlayback =
        currentQueueEntryId !== undefined &&
        indexedPendingPlayback.queueEntryId !== currentQueueEntryId
          ? {...indexedPendingPlayback, queueEntryId: currentQueueEntryId}
          : indexedPendingPlayback

      if (!updatePendingIntent || identifiedPendingPlayback.isPlaying === isPlaying) {
        if (identifiedPendingPlayback !== pendingPlayback) {
          pendingPosition = identifiedPendingPlayback
          writePlayback(identifiedPendingPlayback)
        }
        return
      }

      const updatedPlayback = {...identifiedPendingPlayback, isPlaying}
      pendingPosition = updatedPlayback
      writePlayback(updatedPlayback)
      return
    }

    const positionSeconds = props.getAudioElement()?.currentTime
    if (positionSeconds === undefined || !Number.isFinite(positionSeconds)) {
      return
    }

    writePlayback({
      isPlaying,
      positionSeconds: Math.max(0, positionSeconds),
      trackId: track.id,
    })
  }

  const persistCurrentPlayback = () => {
    persistPlayback(props.isPlaying(), false)
  }
  const persistPlaybackError = () => {
    persistPlayback(false, true)
  }
  const persistPlaybackIntent = (isPlaying: boolean) => {
    persistPlayback(isPlaying, true)
  }

  const persistSeekedPlayback = () => {
    pendingPosition = null
    persistCurrentPlayback()
  }

  const persistStoppedPlayback = () => {
    if (pendingPosition !== null) {
      writePlayback({...pendingPosition, isPlaying: false})
      pendingPosition = null
      return
    }
    persistPlayback(false, false)
  }

  const applyPendingPosition = () => {
    const playback = pendingPosition
    // oxlint-disable-next-line solid/reactivity -- Called after media source updates and metadata events.
    const track = props.currentTrack()
    const audioElement = props.getAudioElement()

    if (
      playback === null ||
      track?.id !== playback.trackId ||
      (playback.queueEntryId !== undefined &&
        props.currentQueueEntryId?.() !== undefined &&
        props.currentQueueEntryId() !== playback.queueEntryId) ||
      audioElement === undefined ||
      audioElement.readyState < HTMLMediaElement.HAVE_METADATA
    ) {
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
      const currentQueueEntryId = props.currentQueueEntryId?.()
      const restoredPlayback = {
        ...playback,
        positionSeconds,
        ...(playback.queueEntryId === undefined && currentQueueEntryId !== undefined
          ? {queueEntryId: currentQueueEntryId}
          : {}),
      }
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
    persistPlaybackError,
    persistPlaybackIntent,
    persistPlaybackProgress,
    persistSeekedPlayback,
    persistStoppedPlayback,
    setPendingPosition,
    writePlayback,
  }
}
