import {
  type PlaylistPreference,
  type PPlaybackState,
  type PTrack,
  resolvePPlaylist,
} from '../../features/focus-room-audio'

export interface RestorePPlayerStateOptions {
  /** 비동기 조회 전후에 복원이 여전히 유효한지 판단한다. false이면 복원 콜백을 호출하지 않는다. */
  readonly canRestore: () => boolean
  /** 저장 목록 부재 또는 치명적인 트랙 조회 실패 시 적용할 기본 트랙 목록이다. */
  readonly defaultTracks: readonly PTrack[]
  /** 유효한 조회가 끝나면 목록과 저장 재생 상태를 한 번 전달한다. 유효한 항목 ID만 세 번째 인자로 전달한다. */
  readonly onRestore: (
    tracks: readonly PTrack[],
    playback: PPlaybackState | null,
    entryIds?: readonly string[],
  ) => void
  /** 저장 재생 상태 조회이며, null은 저장된 재생 상태가 없음을 뜻한다. */
  readonly playbackRequest: Promise<PPlaybackState | null>
  /** 저장 목록 조회이며, null은 목록 부재, 빈 배열은 명시적으로 비운 목록을 뜻한다. */
  readonly playlistRequest: Promise<PlaylistPreference | readonly string[] | null>
  /** 저장 ID에 대한 트랙 후보를 조회한다. 생략 시 tracks를 사용하며, null 결과는 치명적인 조회 실패다. */
  readonly resolveTracks?: (storedTrackIds: readonly string[]) => Promise<readonly PTrack[] | null>
  /** 별도 트랙 조회가 없을 때 저장 ID를 찾을 전체 후보 목록이다. */
  readonly tracks: readonly PTrack[]
}

/** 저장 목록과 재생 상태 조회가 끝난 뒤 복원하며, 치명적인 트랙 조회 실패 시 기본 목록을 유지한다. */
export const restorePPlayerState = async (options: RestorePPlayerStateOptions): Promise<void> => {
  const [requestedPlaylist, storedPlayback] = await Promise.all([
    options.playlistRequest,
    options.playbackRequest,
  ])
  const storedPlaylist =
    requestedPlaylist === null
      ? null
      : 'trackIds' in requestedPlaylist
        ? requestedPlaylist
        : {trackIds: requestedPlaylist}

  if ((storedPlaylist?.trackIds ?? null) === null && storedPlayback === null) {
    return
  }

  if (!options.canRestore()) {
    return
  }

  const storedTrackIds = storedPlaylist?.trackIds ?? null
  const availableTracks =
    storedTrackIds === null || options.resolveTracks === undefined
      ? options.tracks
      : await options.resolveTracks(storedTrackIds)
  const restoredTracks =
    storedTrackIds === null || availableTracks === null
      ? options.defaultTracks
      : resolvePPlaylist({
          defaultTracks: options.defaultTracks,
          storedTrackIds,
          tracks: availableTracks,
        })
  const restoredEntryIds =
    storedTrackIds === null || storedPlaylist?.entryIds === undefined
      ? undefined
      : resolveEntryIdsForTracks({
          entryIds: storedPlaylist.entryIds,
          restoredTracks,
          storedTrackIds,
        })

  if (!options.canRestore()) {
    return
  }

  if (restoredEntryIds === undefined) {
    options.onRestore(restoredTracks, storedPlayback)
    return
  }

  options.onRestore(restoredTracks, storedPlayback, restoredEntryIds)
}

const resolveEntryIdsForTracks = (options: {
  readonly entryIds: readonly string[]
  readonly restoredTracks: readonly PTrack[]
  readonly storedTrackIds: readonly string[]
}): readonly string[] | undefined => {
  if (
    options.entryIds.length !== options.storedTrackIds.length ||
    new Set(options.entryIds).size !== options.entryIds.length
  ) {
    return undefined
  }

  const entriesByTrackId = new Map<string, string[]>()
  options.storedTrackIds.forEach((trackId, index) => {
    const entryId = options.entryIds[index]
    if (entryId === undefined) {
      return
    }
    const entries = entriesByTrackId.get(trackId) ?? []
    entries.push(entryId)
    entriesByTrackId.set(trackId, entries)
  })

  const restoredEntryIds = options.restoredTracks.map((track) =>
    entriesByTrackId.get(track.id)?.shift(),
  )
  return restoredEntryIds.every((entryId) => entryId !== undefined)
    ? (restoredEntryIds as string[])
    : undefined
}
