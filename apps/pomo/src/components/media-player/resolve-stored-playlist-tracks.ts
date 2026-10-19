import {CUSTOM_TRACK_ID_PREFIX, readCustomAlbumTracks} from '../../features/custom-albums'
import type {PTrack} from '../../features/focus-room-audio'

interface ResolveStoredPlaylistTracksOptions {
  /** 손상 레코드의 오류와 요청 ID를 비치명 진단으로 전달한다. 재생 실패 처리와 분리한다. */
  readonly onCorruptTrack: (error: unknown, trackId: string) => void
  /** DB 실패를 한 번 전달한다. 손상 레코드의 비치명 진단은 제외한다. */
  readonly onError: (error: unknown) => void
  /** 커스텀 트랙을 더할 기준 목록이며, DB 실패나 커스텀 요청 부재 시 같은 목록을 반환한다. */
  readonly sourceTracks: readonly PTrack[]
  /** 저장된 트랙 ID 요청이다. null은 저장 목록 부재이며 비커스텀 ID는 DB 조회에서 제외한다. */
  readonly storedTrackIds: Promise<readonly string[] | null>
}

export const resolveStoredPlaylistTracks = async (
  options: ResolveStoredPlaylistTracksOptions,
): Promise<readonly PTrack[]> => {
  const storedTrackIds = await options.storedTrackIds
  const customTrackIds =
    storedTrackIds?.filter((trackId) => trackId.startsWith(CUSTOM_TRACK_ID_PREFIX)) ?? []

  if (customTrackIds.length === 0) {
    return options.sourceTracks
  }

  try {
    const customTracks = await readCustomAlbumTracks({
      onError: options.onCorruptTrack,
      trackIds: customTrackIds,
    })
    return [...options.sourceTracks, ...customTracks]
  } catch (error: unknown) {
    options.onError(error)
    return options.sourceTracks
  }
}
