import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
import type {PTrack} from '../focus-room-audio'
import type {StoredCustomTrack} from './database'
import {BYTES_PER_MEBIBYTE} from './model'

interface TrackObjectUrl {
  audio: Blob
  generation: number
  pendingAudio: Blob | null
  readFailure: {audio: Blob; error: unknown; generation: number} | null
  source: string
}

const trackObjectUrls = new Map<string, TrackObjectUrl>()
const COMPARISON_CHUNK_BYTES = BYTES_PER_MEBIBYTE
let storageGeneration = 0

export const getCustomTrackStorageGeneration = (): number => storageGeneration

const hasSameAudio = async (left: Blob, right: Blob): Promise<boolean> => {
  if (left === right) {
    return true
  }
  if (left.size !== right.size || left.type !== right.type) {
    return false
  }

  for (let offset = 0; offset < left.size; offset += COMPARISON_CHUNK_BYTES) {
    const readChunk = (audio: Blob) =>
      Promise.resolve().then(() =>
        audio.slice(offset, offset + COMPARISON_CHUNK_BYTES).arrayBuffer(),
      )
    // oxlint-disable-next-line no-await-in-loop -- Bound comparison buffers to one pair of 1 MiB chunks, including failed reads.
    const [leftRead, rightRead] = await Promise.allSettled([readChunk(left), readChunk(right)])
    if (leftRead.status === 'rejected') {
      throw leftRead.reason
    }
    if (rightRead.status === 'rejected') {
      throw rightRead.reason
    }
    const leftBuffer = leftRead.value
    const rightBuffer = rightRead.value
    const leftBytes = new Uint8Array(leftBuffer)
    const rightBytes = new Uint8Array(rightBuffer)
    for (let index = 0; index < leftBytes.length; index += 1) {
      if (leftBytes[index] !== rightBytes[index]) {
        return false
      }
    }
  }
  return true
}

interface TrackAudioUpdate {
  readonly entry: TrackObjectUrl
  readonly generation: number
  readonly failure?: NonNullable<TrackObjectUrl['readFailure']>
  readonly track: Pick<StoredCustomTrack, 'id' | 'audio'>
}

const reconcileTrackAudio = async ({
  entry,
  failure,
  generation,
  track,
}: TrackAudioUpdate): Promise<void> => {
  const ownsComparison = () =>
    trackObjectUrls.get(track.id) === entry &&
    entry.generation === generation &&
    (failure === undefined || entry.readFailure === failure)
  while (ownsComparison()) {
    const previousAudio = entry.audio
    let result: {isSame: boolean} | {error: unknown}
    try {
      // oxlint-disable-next-line no-await-in-loop -- Recheck only when a playback read replaced the compared source.
      result = {isSame: await hasSameAudio(previousAudio, track.audio)}
    } catch (error: unknown) {
      result = {error}
    }
    if (!ownsComparison()) {
      break
    }
    if (entry.audio === previousAudio) {
      if ('error' in result) {
        // The durable save already succeeded. Surface a failed comparison at
        // the next playback read instead of reporting a failed database write.
        if (failure === undefined) {
          entry.readFailure = {audio: track.audio, error: result.error, generation}
        } else {
          // A failed peer must not invalidate successful peers retrying this failure.
          failure.error = result.error
        }
        break
      }
      entry.readFailure = null
      entry.pendingAudio = result.isSame ? null : track.audio
      break
    }
  }
}

/** Reconciles committed audio while retaining URLs until their next playback read. */
export const refreshCustomTrackObjectUrls = async (
  tracks: readonly Pick<StoredCustomTrack, 'id' | 'audio'>[],
): Promise<void> => {
  storageGeneration += 1
  const updates = tracks.flatMap((track) => {
    const entry = trackObjectUrls.get(track.id)
    if (entry === undefined) {
      return []
    }
    entry.readFailure = null
    entry.generation += 1
    return [{entry, generation: entry.generation, track}]
  })
  for (const update of updates) {
    // oxlint-disable-next-line no-await-in-loop -- Keep the album-wide comparison buffer bound independent of track count.
    await reconcileTrackAudio(update)
  }
}

/** Retries failed comparisons and returns the storage generation captured before awaiting. */
export const retryCustomTrackObjectUrls = async (
  tracks: readonly Pick<StoredCustomTrack, 'id' | 'audio'>[],
): Promise<number> => {
  const snapshotGeneration = storageGeneration
  const updates = tracks.flatMap((track) => {
    const entry = trackObjectUrls.get(track.id)
    const failure = entry?.readFailure
    return entry === undefined || failure === undefined || failure === null
      ? []
      : [
          {
            entry,
            failure,
            generation: failure.generation,
            track: {audio: failure.audio, id: track.id},
          },
        ]
  })
  for (const update of updates) {
    // oxlint-disable-next-line no-await-in-loop -- Retry one failed track at a time without multiplying chunk buffers.
    await reconcileTrackAudio(update)
  }
  return snapshotGeneration
}

export const revokeCustomTrackObjectUrls = (trackIds: ReadonlySet<string>): void => {
  if (trackIds.size > 0) {
    storageGeneration += 1
  }
  for (const trackId of trackIds) {
    const entry = trackObjectUrls.get(trackId)

    if (entry !== undefined) {
      replaceBlobObjectUrl(entry.source, () => null)
      trackObjectUrls.delete(trackId)
    }
  }
}

export const toCustomPTrack = (track: StoredCustomTrack): PTrack => {
  let entry = trackObjectUrls.get(track.id)
  if (entry === undefined) {
    entry = {
      audio: track.audio,
      generation: 0,
      pendingAudio: null,
      readFailure: null,
      source: replaceBlobObjectUrl(null, () => track.audio),
    }
    trackObjectUrls.set(track.id, entry)
  } else if (entry.readFailure !== null) {
    throw entry.readFailure.error
  } else if (entry.pendingAudio !== null) {
    const audio = entry.pendingAudio
    entry.source = replaceBlobObjectUrl(entry.source, () => audio, {order: 'create-first'})
    entry.audio = audio
    entry.pendingAudio = null
  }

  return {
    artist: track.artist,
    durationSeconds: track.durationSeconds,
    id: track.id,
    source: entry.source,
    sourceBlob: entry.audio,
    title: track.title,
  }
}
