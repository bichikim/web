import 'media-chrome'
import {createSignal, type JSX, mergeProps} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {MediaPlayerContext} from './context'
import type {MediaPlayerOptions, PlayerState} from './types'
import {usePlayerController} from './use-player-controller'
import {usePlayerMediaSession} from './use-session'

export interface MediaPlayerProps extends MediaPlayerOptions {
  readonly children?: JSX.Element
  readonly class?: string
}

const readDuration = (element: HTMLAudioElement) => {
  const {duration} = element
  return Number.isFinite(duration) ? duration : 0
}

/**
 * 음악 목록의 재생·탐색·이전/다음·셔플·반복과 디바이스 미디어 표시·제어를 담당한다.
 * 상태 변화는 이벤트로 알리고, 하위 컨트롤은 useMediaPlayer로 조작한다.
 * tracks를 생략하면 저장된 Pomo 재생목록을 복원하고 앨범 추가·삭제를 지원한다.
 */
export const MediaPlayer = (props: MediaPlayerProps) => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  const [controller, setController] = createSignal<HTMLElement>()
  const options = mergeProps(props, {element})
  const player = usePlayerController(options)
  const {
    onEnded,
    onError,
    onLoadedMetadata,
    onPause,
    onPlay,
    onSeeked,
    onSeeking,
    onTimeUpdate,
    pause,
    play,
    seek,
  } = player
  const controls: PlayerState = {
    addTracksToQueue: player.addTracksToQueue,
    canEditQueue: player.canEditQueue,
    canNavigateNextTrack: player.canNavigateNextTrack,
    canNavigatePreviousTrack: player.canNavigatePreviousTrack,
    clearTrackQueue: player.clearTrackQueue,
    currentIndex: player.currentIndex,
    currentTrack: player.currentTrack,
    isPlaying: player.isPlaying,
    levels: player.levels,
    previewPlayback: player.previewPlayback,
    removeTrackFromQueue: player.removeTrackFromQueue,
    repeatMode: player.repeatMode,
    selectChosenTrack: player.selectChosenTrack,
    selectNextTrack: player.selectNextTrack,
    selectPreviousTrack: player.selectPreviousTrack,
    shuffleEnabled: player.shuffleEnabled,
    toggleRepeatMode: player.toggleRepeatMode,
    toggleShuffle: player.toggleShuffle,
    tracks: player.tracks,
  }
  useEvent(controller, 'mediapauserequest', player.markPauseIntent)
  usePlayerMediaSession({
    currentTrack: player.currentTrack,
    isPlaying: player.isPlaying,
    onNextTrack: player.selectNextTrack,
    onPause: pause,
    onPlay: play,
    onPreviousTrack: player.selectPreviousTrack,
  })
  const handleEnded = () => {
    const endedTrack = player.currentTrack() ?? null
    onEnded()
    props.onEnded?.(endedTrack)
  }
  const handleError: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    onError(event.currentTarget.error ?? new Error('Audio playback failed'))
  }
  const handleLoadedMetadata: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    onLoadedMetadata()
    props.onDurationChange?.(readDuration(event.currentTarget))
  }
  const handleDurationChange: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    props.onDurationChange?.(readDuration(event.currentTarget))
  }
  const handleTimeUpdate: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    onTimeUpdate()
    props.onTimeUpdate?.({
      currentTime: event.currentTarget.currentTime,
      duration: readDuration(event.currentTarget),
    })
  }
  const handleVolumeChange: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    props.onVolumeChange?.({
      muted: event.currentTarget.muted,
      volume: event.currentTarget.volume,
    })
  }
  return (
    <MediaPlayerContext.Provider value={{...controls, pause, play, seek}}>
      <media-controller ref={setController} audio="" class={props.class}>
        <audio
          ref={setElement}
          crossorigin="anonymous"
          preload="metadata"
          slot="media"
          src={player.currentTrack()?.source}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={handleEnded}
          onError={handleError}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onSeeking={onSeeking}
          onSeeked={onSeeked}
          onTimeUpdate={handleTimeUpdate}
          onVolumeChange={handleVolumeChange}
        />
        {props.children}
      </media-controller>
    </MediaPlayerContext.Provider>
  )
}
