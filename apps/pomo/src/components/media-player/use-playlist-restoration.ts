import {type Accessor, createEffect, onCleanup, onMount} from 'solid-js'
import {
  loadPTrackQueueSource,
  type PlaylistPreference,
  type PPlaybackState,
  type PTrack,
  readPPlayback,
} from '../../features/focus-room-audio'
import {restorePPlayerState} from './restoration'

export interface PlaylistLoad {
  readonly defaultTracks: readonly PTrack[]
  readonly queueChanged: boolean
}

export interface UsePlaylistRestorationProps {
  readonly savedPlaylist: Accessor<PlaylistPreference | null>
  readonly tracks: Accessor<readonly PTrack[]>
  readonly isQueueControlled: Accessor<boolean>
  readonly playbackRevision: Accessor<number>
  readonly queueRevision: Accessor<number>
  readonly onLoad: (loaded: PlaylistLoad) => readonly PTrack[]
  readonly onLoadSettled: () => void
  readonly onRestore: (tracks: readonly PTrack[], playback: PPlaybackState | null) => void
  readonly onError: (error: unknown) => void
}

/** 목록과 저장된 재생 상태를 불러오고, 사용자 조작 이후의 오래된 복원과 종료 후 적용을 막는다. */
export const usePlaylistRestoration = (props: UsePlaylistRestorationProps): void => {
  const playlist = Promise.withResolvers<readonly string[] | null>()
  createEffect(() => {
    const saved = props.savedPlaylist()
    if (saved !== null) {
      playlist.resolve(saved.trackIds)
    }
  })
  const request = new AbortController()
  let disposed = false
  let controlledRestoreRevision: number | undefined
  let controlledPlayback: PPlaybackState | null | undefined
  let controlledPlaybackRestored = false
  const handleError = (error: unknown) => {
    if (!disposed) {
      props.onError(error)
    }
  }
  const restoreControlledPlayback = (tracks: readonly PTrack[]) => {
    if (
      disposed ||
      controlledRestoreRevision === undefined ||
      props.playbackRevision() !== controlledRestoreRevision ||
      controlledPlayback === undefined ||
      controlledPlayback === null ||
      controlledPlaybackRestored ||
      tracks.length === 0
    ) {
      return
    }

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
          onRestore: (tracks, playback) => props.onRestore(tracks, playback),
          playbackRequest,
          playlistRequest: effectivePlaylistRequest,
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
