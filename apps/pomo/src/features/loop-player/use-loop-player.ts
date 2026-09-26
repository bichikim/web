import {createLoopPlaybackControls} from './create-loop-playback-controls'
import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
import {getExceptionMessage} from 'src/features/error-detail'
import {createSignal, onCleanup} from 'solid-js'
import {DEFAULT_CONNECTION_SECONDS} from '../sound-generation/connection'
import {createLoopPlayer, type LoopPlayback} from './player'

export function useLoopPlayer() {
  const [connectionSeconds, setConnectionSeconds] = createSignal(DEFAULT_CONNECTION_SECONDS)
  const [duration, setDuration] = createSignal(0)
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('반복할 오디오 파일을 선택해 주세요.')
  let player: LoopPlayback | undefined
  let url: string | undefined
  const controls = createLoopPlaybackControls({
    onSeekError: (cause) => {
      setPlaying(false)
      setStatus(getExceptionMessage(cause, '위치 이동 실패'))
    },
    player: () => player,
  })
  const {position, previewPosition, seek} = controls
  const clear = () => {
    controls.invalidate()
    const previous = player
    const previousUrl = url
    player = undefined
    url = undefined
    if (previous !== undefined) {
      previous
        .close()
        .catch((cause) => console.warn('Audio cleanup failed', cause))
        .finally(() => {
          if (previousUrl !== undefined) {
            replaceBlobObjectUrl(previousUrl, () => null)
          }
        })
    } else if (previousUrl !== undefined) {
      replaceBlobObjectUrl(previousUrl, () => null)
    }
    setPlaying(false)
    setDuration(0)
    controls.cancelScrubbing()
    controls.updatePosition(0)
  }
  onCleanup(clear)
  const select = (file: File | null) => {
    clear()
    if (file === null) {
      setStatus('오디오 파일을 선택해 주세요.')
      return
    }
    setStatus('오디오를 읽고 있어요…')
    const source = replaceBlobObjectUrl(null, () => file)
    url = source
    try {
      player = createLoopPlayer(
        source,
        (message, active) => {
          if (url === source) {
            setStatus(message)
            setPlaying(active)
          }
        },
        (seconds) => {
          if (url === source) {
            setDuration(seconds)
            setStatus('재생 준비 완료')
          }
        },
        (seconds) => {
          if (url === source) {
            controls.updatePosition(seconds)
          }
        },
      )
    } catch (cause) {
      clear()
      setStatus(getExceptionMessage(cause, '플레이어를 준비하지 못했습니다.'))
    }
  }
  const play = async (preview: boolean) => {
    controls.invalidate()
    const current = player
    if (current === undefined) {
      return
    }
    setPlaying(true)
    try {
      await current.play(connectionSeconds(), preview, position())
    } catch (cause) {
      if (current === player) {
        setPlaying(false)
        setStatus(getExceptionMessage(cause, '재생 실패'))
      }
    }
  }
  const stop = () => {
    controls.invalidate()
    player?.stop()
    setPlaying(false)
    setStatus('정지했습니다.')
  }

  return {
    connectionSeconds,
    duration,
    play,
    playing,
    position,
    previewPosition,
    seek,
    select,
    setConnectionSeconds,
    status,
    stop,
  }
}
