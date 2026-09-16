import {type Accessor, onCleanup, onMount} from 'solid-js'
import {
  loadPTrackQueueSource,
  type PPlaybackState,
  type PTrack,
  readPPlayback,
  readPPlaylist,
} from '../../features/focus-room-audio'
import {restorePPlayerState} from './restoration'

export interface PlaylistLoad {
  readonly defaultTracks: readonly PTrack[]
  readonly queueChanged: boolean
}

export interface UsePlaylistRestorationProps {
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
  const request = new AbortController()
  let disposed = false
  const handleError = (error: unknown) => {
    if (!disposed) {
      props.onError(error)
    }
  }

  // 복원 콜백이 오디오 요소를 사용하므로 ref가 연결된 뒤 복원을 시작한다.
  onMount(() => {
    const restoreRevision = props.playbackRevision()
    const initialQueueRevision = props.queueRevision()
    let resolvedQueueRevision = initialQueueRevision
    const playbackRequest = readPPlayback().catch((error: unknown) => {
      handleError(error)
      return null
    })
    if (props.isQueueControlled()) {
      playbackRequest
        .then((playback) => {
          if (disposed || props.playbackRevision() !== restoreRevision || playback === null) {
            return
          }
          props.onRestore(props.tracks(), playback)
        })
        .catch(handleError)
      return
    }

    const playlistRequest = readPPlaylist().catch((error: unknown) => {
      handleError(error)
      return null
    })

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
    request.abort()
  })
}
