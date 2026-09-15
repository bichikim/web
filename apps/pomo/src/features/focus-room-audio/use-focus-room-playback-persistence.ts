import type {Accessor} from 'solid-js'

import type {PTrack} from './focus-room-playlist'
import {type PPlaybackState, writePPlayback} from './playback-storage'

const PROGRESS_SAVE_INTERVAL_MILLISECONDS = 5_000

export interface UsePPlaybackPersistenceProps {
  readonly currentTrack: Accessor<PTrack | undefined>
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

interface RestoredPlaybackSeek {
  readonly positionSeconds: number
  readonly trackId: string
}

const writeStoredPlayback = (state: PPlaybackState) => {
  writePPlayback(state).catch(() => undefined)
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Playback persistence coordinates restore, seek and stop lifecycles behind one consumer contract.
export const usePPlaybackPersistence = (
  props: UsePPlaybackPersistenceProps,
): PPlaybackPersistence => {
  let pendingPosition: PPlaybackState | null = null
  let pendingRestoredPlay: PPlaybackState | null = null
  let pendingRestoredSeek: RestoredPlaybackSeek | null = null
  let lastProgressSavedAt = 0

  const clearRestoredPlayback = () => {
    pendingRestoredPlay = null
    pendingRestoredSeek = null
  }

  const writePlayback = (state: PPlaybackState) => {
    clearRestoredPlayback()
    writeStoredPlayback(state)
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
    if (pendingPlayback?.trackId === track.id) {
      if (!updatePendingIntent || pendingPlayback.isPlaying === isPlaying) {
        return
      }

      const updatedPlayback = {...pendingPlayback, isPlaying}
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

  const persistRestoredPlayback = () => {
    const pendingPlay = pendingRestoredPlay
    if (pendingPlay === null) {
      return false
    }

    // oxlint-disable-next-line solid/reactivity -- Called from media events to read their latest state.
    const track = props.currentTrack()
    if (track?.id !== pendingPlay.trackId) {
      clearRestoredPlayback()
      return false
    }

    const positionSeconds = props.getAudioElement()?.currentTime
    if (positionSeconds === undefined || !Number.isFinite(positionSeconds)) {
      return true
    }

    const updatedPlayback = {...pendingPlay, positionSeconds: Math.max(0, positionSeconds)}
    pendingRestoredPlay = updatedPlayback
    writeStoredPlayback(updatedPlayback)
    return true
  }

  const shouldDeferRestoredSeekPersistence = () => {
    const pendingSeek = pendingRestoredSeek
    if (pendingSeek === null) {
      return false
    }

    // oxlint-disable-next-line solid/reactivity -- Called from media events to read their latest state.
    const track = props.currentTrack()
    const positionSeconds = props.getAudioElement()?.currentTime
    if (track?.id === pendingSeek.trackId && positionSeconds === pendingSeek.positionSeconds) {
      return true
    }

    pendingRestoredSeek = null
    return false
  }

  const persistCurrentPlayback = () => {
    if (shouldDeferRestoredSeekPersistence()) {
      return
    }

    if (persistRestoredPlayback()) {
      return
    }

    persistPlayback(props.isPlaying(), false)
  }
  const persistPlaybackError = () => {
    clearRestoredPlayback()
    persistPlayback(false, true)
  }
  const persistPlaybackIntent = (isPlaying: boolean) => {
    clearRestoredPlayback()
    persistPlayback(isPlaying, true)
  }

  const persistSeekedPlayback = () => {
    if (shouldDeferRestoredSeekPersistence()) {
      return
    }

    persistCurrentPlayback()
  }

  const persistStoppedPlayback = () => {
    clearRestoredPlayback()
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
      const restoredPlayback = {...playback, positionSeconds}
      writeStoredPlayback(restoredPlayback)
      pendingRestoredPlay = restoredPlayback.isPlaying ? restoredPlayback : null
      pendingRestoredSeek = {positionSeconds, trackId: restoredPlayback.trackId}
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
