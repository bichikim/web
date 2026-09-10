import {createSignal, onCleanup} from 'solid-js'
import {createLoopPlayer, type LoopPlayback} from './player'

const DEFAULT_OVERLAP = 4
export function useLoopPlayer() {
  const [position, setPosition] = createSignal(0)
  const [scrubbing, setScrubbing] = createSignal(false)
  const [overlap, setOverlap] = createSignal(DEFAULT_OVERLAP)
  const [duration, setDuration] = createSignal(0)
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('반복할 오디오 파일을 선택해 주세요.')
  let player: LoopPlayback | undefined
  let url: string | undefined
  const clear = () => {
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
            URL.revokeObjectURL(previousUrl)
          }
        })
    } else if (previousUrl !== undefined) {
      URL.revokeObjectURL(previousUrl)
    }
    setPlaying(false)
    setDuration(0)
    setPosition(0)
    setScrubbing(false)
  }
  onCleanup(clear)
  const select = (file: File | null) => {
    clear()
    if (file === null) {
      setStatus('오디오 파일을 선택해 주세요.')
      return
    }
    setStatus('오디오를 읽고 있어요…')
    const source = URL.createObjectURL(file)
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
          if (url === source && !scrubbing()) {
            setPosition(seconds)
          }
        },
      )
    } catch (cause) {
      clear()
      setStatus(cause instanceof Error ? cause.message : '플레이어를 준비하지 못했습니다.')
    }
  }
  const play = async (preview: boolean) => {
    const current = player
    if (current === undefined) {
      return
    }
    setPlaying(true)
    try {
      await current.play(overlap(), preview, position())
    } catch (cause) {
      if (current === player) {
        setPlaying(false)
        setStatus(cause instanceof Error ? cause.message : '재생 실패')
      }
    }
  }
  const stop = () => {
    player?.stop()
    setPlaying(false)
    setStatus('정지했습니다.')
  }
  const previewPosition = (seconds: number) => {
    setScrubbing(true)
    setPosition(seconds)
  }
  const seek = async () => {
    const current = player
    const target = position()
    setScrubbing(false)
    if (current === undefined) {
      return
    }
    try {
      await current.seek(target)
    } catch (cause) {
      if (current === player) {
        setStatus(cause instanceof Error ? cause.message : '위치 이동 실패')
      }
    }
  }
  return {
    duration,
    overlap,
    play,
    playing,
    position,
    previewPosition,
    seek,
    select,
    setOverlap,
    status,
    stop,
  }
}
