import type {PTrack} from './focus-room-playlist'
import type {PPlaybackState} from './playback-storage'
import {hasValidPlaylistEntryIds} from './playlist-entry'
import {normalizeTrackIndex} from './playback-policy'

export interface ResolvePlaybackRestoreOptions {
  readonly fallbackIndex: number
  readonly queueEntryIds?: readonly string[]
  readonly storedPlayback: PPlaybackState | null
  readonly tracks: readonly PTrack[]
}

export interface PlaybackRestore {
  readonly currentIndex: number
  readonly playback: PPlaybackState | null
  readonly shouldPersist: boolean
}

const findQueueEntryIndex = (
  queueEntryId: string | undefined,
  trackId: string,
  queueEntryIds: readonly string[] | undefined,
  tracks: readonly PTrack[],
) => {
  if (queueEntryId === undefined || queueEntryIds === undefined) {
    return -1
  }

  return queueEntryIds.findIndex(
    (entryId, index) => entryId === queueEntryId && tracks[index]?.id === trackId,
  )
}

const findMatchingTrackIndex = (storedPlayback: PPlaybackState, tracks: readonly PTrack[]) => {
  const storedIndex = storedPlayback.trackIndex
  if (
    storedIndex !== undefined &&
    Number.isInteger(storedIndex) &&
    storedIndex >= 0 &&
    tracks[storedIndex]?.id === storedPlayback.trackId
  ) {
    return storedIndex
  }

  return tracks.findIndex((track) => track.id === storedPlayback.trackId)
}

const restoreMatchedPlayback = (
  storedPlayback: PPlaybackState,
  matchedIndex: number,
  queueEntryIds: readonly string[] | undefined,
): PlaybackRestore => {
  const queueEntryId = queueEntryIds?.[matchedIndex]
  const shouldPersist =
    (storedPlayback.trackIndex !== undefined && storedPlayback.trackIndex !== matchedIndex) ||
    (queueEntryId !== undefined && storedPlayback.queueEntryId !== queueEntryId)

  if (!shouldPersist) {
    return {currentIndex: matchedIndex, playback: storedPlayback, shouldPersist: false}
  }

  return {
    currentIndex: matchedIndex,
    playback: {
      ...storedPlayback,
      ...(queueEntryId === undefined ? {} : {queueEntryId}),
      ...(queueEntryIds === undefined && storedPlayback.trackIndex === undefined
        ? {}
        : {trackIndex: matchedIndex}),
    },
    shouldPersist: true,
  }
}

const restoreFirstTrack = (
  tracks: readonly PTrack[],
  queueEntryIds: readonly string[] | undefined,
): PlaybackRestore => ({
  currentIndex: 0,
  playback: {
    isPlaying: false,
    positionSeconds: 0,
    ...(queueEntryIds?.[0] === undefined ? {} : {queueEntryId: queueEntryIds[0]}),
    trackId: tracks[0].id,
    trackIndex: 0,
  },
  shouldPersist: true,
})

export const resolvePlaybackRestore = (options: ResolvePlaybackRestoreOptions): PlaybackRestore => {
  const trackCount = options.tracks.length

  if (trackCount === 0) {
    return {currentIndex: 0, playback: null, shouldPersist: false}
  }

  if (options.storedPlayback === null) {
    const currentIndex = normalizeTrackIndex(options.fallbackIndex, trackCount) ?? 0
    return {currentIndex, playback: null, shouldPersist: false}
  }

  const queueEntryIds = hasValidPlaylistEntryIds(
    options.tracks.map((track) => track.id),
    options.queueEntryIds,
  )
    ? options.queueEntryIds
    : undefined
  const storedEntryIndex = findQueueEntryIndex(
    options.storedPlayback.queueEntryId,
    options.storedPlayback.trackId,
    queueEntryIds,
    options.tracks,
  )
  const matchingIndex = findMatchingTrackIndex(options.storedPlayback, options.tracks)
  const matchedIndex = storedEntryIndex >= 0 ? storedEntryIndex : matchingIndex

  if (matchedIndex >= 0) {
    return restoreMatchedPlayback(options.storedPlayback, matchedIndex, queueEntryIds)
  }

  return restoreFirstTrack(options.tracks, queueEntryIds)
}
