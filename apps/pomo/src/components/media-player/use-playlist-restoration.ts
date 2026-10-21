import {type Accessor, createEffect, onCleanup, onMount} from 'solid-js'
import {
  loadPTrackQueueSource,
  type PlaylistPreference,
  type PPlaybackState,
  type PTrack,
  readPPlayback,
} from '../../features/focus-room-audio'
import {restorePPlayerState} from './restoration'
import {resolveStoredPlaylistTracks} from './resolve-stored-playlist-tracks'

export interface PlaylistLoad {
  readonly defaultTracks: readonly PTrack[]
  readonly queueChanged: boolean
}

export interface UsePlaylistRestorationProps {
  /** 저장된 재생 목록이다. null이면 초기 저장소 복원 완료를 기다린다. */
  readonly savedPlaylist: Accessor<PlaylistPreference | null>
  /** 현재 사용 가능한 트랙으로, 외부 제어 목록의 재생 상태 복원에도 사용한다. */
  readonly tracks: Accessor<readonly PTrack[]>
  /** true이면 호출자가 큐를 소유하므로 저장 목록 대신 재생 상태만 복원한다. */
  readonly isQueueControlled: Accessor<boolean>
  /** 복원 중 사용자의 재생 조작을 감지해 오래된 결과 적용을 막는 revision이다. */
  readonly playbackRevision: Accessor<number>
  /** 복원 중 큐 편집을 감지해 저장 목록이 새 큐를 덮어쓰지 않게 하는 revision이다. */
  readonly queueRevision: Accessor<number>
  /** 기본 목록 로드 결과를 반영하고 현재 복원에 사용할 목록을 반환한다. */
  readonly onLoad: (loaded: PlaylistLoad) => readonly PTrack[]
  /** 목록 로드가 성공하거나 실패해 초기 준비가 끝났을 때 호출한다. */
  readonly onLoadSettled: () => void
  /** 유효한 복원 결과를 적용한다. entryIds 생략 시 기존 트랙 ID 기반 목록을 사용한다. */
  readonly onRestore: (
    tracks: readonly PTrack[],
    playback: PPlaybackState | null,
    entryIds?: readonly string[],
  ) => void
  /** 손상 레코드의 비치명 진단과 요청 ID를 전달하며, owner 폐기 후에는 호출하지 않는다. */
  readonly onCorruptTrack: (error: unknown, trackId: string) => void
  /** 목록·재생 상태·DB 복원 실패를 전달한다. 손상 건별 진단과 폐기 후 알림은 제외한다. */
  readonly onError: (error: unknown) => void
}

/** 목록과 저장된 재생 상태를 불러오고, 사용자 조작 이후의 오래된 복원과 종료 후 적용을 막는다. */
export const usePlaylistRestoration = (props: UsePlaylistRestorationProps): void => {
  const playlist = Promise.withResolvers<PlaylistPreference | null>()
  createEffect(() => {
    const saved = props.savedPlaylist()
    if (saved !== null) {
      playlist.resolve(saved)
    }
  })
  const request = new AbortController()
  let disposed = false
  let controlledRestoreRevision: number | undefined
  let controlledPlayback: PPlaybackState | null | undefined
  let controlledPlaybackRestored = false
  let controlledRestoreWaitingForTracks = false
  const handleError = (error: unknown) => {
    if (!disposed) {
      props.onError(error)
    }
  }
  const handleCorruptTrack = (error: unknown, trackId: string) => {
    if (!disposed) {
      props.onCorruptTrack(error, trackId)
    }
  }
  const restoreControlledPlayback = (tracks: readonly PTrack[]) => {
    if (
      disposed ||
      controlledRestoreRevision === undefined ||
      controlledPlayback === undefined ||
      controlledPlayback === null ||
      controlledPlaybackRestored
    ) {
      return
    }

    const playbackRevision = props.playbackRevision()
    if (tracks.length === 0) {
      controlledRestoreWaitingForTracks = true
      return
    }

    if (!controlledRestoreWaitingForTracks && playbackRevision !== controlledRestoreRevision) {
      return
    }

    // 트랙 대기 중에는 복원을 무효화할 재생 대상이 없으므로 도착 시점의 revision을 기준으로 삼는다.
    controlledRestoreRevision = playbackRevision
    controlledPlaybackRestored = true
    props.onRestore(tracks, controlledPlayback)
  }
  createEffect(() => {
    if (!props.isQueueControlled()) {
      return
    }

    const tracks = props.tracks()
    restoreControlledPlayback(tracks)
  })

  // 복원 콜백이 오디오 요소를 사용하므로 ref가 연결된 뒤 복원을 시작한다.
  onMount(() => {
    const restoreRevision = props.playbackRevision()
    controlledRestoreRevision = restoreRevision
    const initialQueueRevision = props.queueRevision()
    let resolvedQueueRevision = initialQueueRevision
    const playbackRequest = readPPlayback().catch((error: unknown) => {
      handleError(error)
      return null
    })
    if (props.isQueueControlled()) {
      playbackRequest
        .then((playback) => {
          controlledPlayback = playback
          restoreControlledPlayback(props.tracks())
        })
        .catch(handleError)
      return
    }

    const playlistRequest = playlist.promise

    loadPTrackQueueSource({signal: request.signal})
      .then((source) => {
        if (disposed) {
          return
        }
        const queueChanged = props.queueRevision() !== initialQueueRevision
        const resolvedTracks = props.onLoad({
          defaultTracks: source.defaultTracks,
          queueChanged,
        })
        props.onLoadSettled()
        resolvedQueueRevision = props.queueRevision()
        // 초기 로드 중 바뀐 큐는 저장 목록보다 최신이므로 저장 목록 대기를 생략한다.
        const effectivePlaylistRequest = queueChanged ? Promise.resolve(null) : playlistRequest
        return restorePPlayerState({
          canRestore: () =>
            !disposed &&
            props.playbackRevision() === restoreRevision &&
            props.queueRevision() === resolvedQueueRevision,
          defaultTracks: resolvedTracks,
          onRestore: (restoredTracks, playback, entryIds) => {
            if (entryIds === undefined) {
              props.onRestore(restoredTracks, playback)
              return
            }
            props.onRestore(restoredTracks, playback, entryIds)
          },
          playbackRequest,
          playlistRequest: effectivePlaylistRequest,
          resolveTracks: (storedTrackIds) =>
            resolveStoredPlaylistTracks({
              onCorruptTrack: handleCorruptTrack,
              onError: handleError,
              sourceTracks: source.tracks,
              storedTrackIds: Promise.resolve(storedTrackIds),
            }),
          tracks: source.tracks,
        })
      })
      .catch((error: unknown) => {
        if (!disposed) {
          props.onLoadSettled()
        }
        handleError(error)
      })
  })

  onCleanup(() => {
    disposed = true
    playlist.resolve(null)
    request.abort()
  })
}
