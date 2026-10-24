import type {PTrack} from '../focus-room-audio'
import {
  openCustomAlbumDatabase,
  readRequest,
  storedTrackSchema,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'
import {CUSTOM_TRACK_ID_PREFIX, CustomAlbumError} from './model'
import {
  getCustomTrackStorageGeneration,
  retryCustomTrackObjectUrls,
  toCustomPTrack,
} from './to-custom-p-track'

export interface ReadCustomAlbumTracksOptions {
  /** 누락 레코드는 제외하고, 손상된 요청 레코드마다 원래 검증 원인과 요청 ID를 한 번 전달한다. */
  readonly onError: (error: CustomAlbumError, trackId: string) => void
  /** 요청 순서를 보존하며 중복 ID와 커스텀 트랙이 아닌 ID는 제외한다. */
  readonly trackIds: readonly string[]
}

/** 손상 레코드만 건너뛰어 정상 트랙을 읽는다. 저장소는 변경하지 않으며 DB 요청·트랜잭션 실패는 거부한다. */
const readCustomAlbumTrackSnapshot = async (
  options: ReadCustomAlbumTracksOptions,
): Promise<readonly PTrack[] | null> => {
  const trackIds = Array.from(
    new Set(options.trackIds.filter((trackId) => trackId.startsWith(CUSTOM_TRACK_ID_PREFIX))),
  )

  if (trackIds.length === 0) {
    return []
  }

  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction(TRACK_STORE_NAME, 'readonly')
  const finished = waitForTransaction(transaction)
  const trackRequests = trackIds.map((trackId) =>
    readRequest<unknown>(transaction.objectStore(TRACK_STORE_NAME).get(trackId)).then((track) => ({
      track,
      trackId,
    })),
  )
  const [, requestedTracks] = await Promise.all([finished, Promise.all(trackRequests)])
  const parsedTracks = requestedTracks.flatMap(({track, trackId}) => {
    if (track === undefined) {
      return []
    }

    return [{result: storedTrackSchema.safeParse(track), trackId}]
  })
  const tracks = parsedTracks.flatMap(({result}) => (result.success ? [result.data] : []))

  const snapshotGeneration = await retryCustomTrackObjectUrls(tracks)
  if (snapshotGeneration !== getCustomTrackStorageGeneration()) {
    return null
  }
  for (const {result, trackId} of parsedTracks) {
    if (!result.success) {
      options.onError(new CustomAlbumError('corrupt-data', {cause: result.error}), trackId)
    }
  }
  return tracks.map(toCustomPTrack)
}

export const readCustomAlbumTracks = async (
  options: ReadCustomAlbumTracksOptions,
): Promise<readonly PTrack[]> => {
  const first = await readCustomAlbumTrackSnapshot(options)
  const result = first ?? (await readCustomAlbumTrackSnapshot(options))
  if (result === null) {
    throw new Error('Custom album storage changed while retrying cached audio.')
  }
  return result
}
