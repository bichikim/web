import {createSignal} from 'solid-js'
import type {LoopPlayback} from './player'

interface LoopPlaybackControlsOptions {
  /** 현재 소유한 플레이어를 반환하며, 없으면 위치 이동을 실행하지 않습니다. */
  readonly player: () => LoopPlayback | undefined
  /** 최신 위치 이동이 실패하면 원인을 전달합니다. */
  readonly onSeekError: (error: unknown) => void
  /** 최신 위치 이동 후 재생 여부를 전달하며, 생략하면 결과를 별도로 알리지 않습니다. */
  readonly onSeekResult?: (playing: boolean) => void
}

/** Owns scrub previews and ignores seek completions superseded by playback changes. */
export const createLoopPlaybackControls = (options: LoopPlaybackControlsOptions) => {
  const [position, setPosition] = createSignal(0)
  let scrubbing = false
  let previousPosition = 0
  let revision = 0
  const invalidate = () => {
    revision += 1
  }
  const cancelScrubbing = () => {
    invalidate()
    scrubbing = false
    previousPosition = 0
  }
  const updatePosition = (seconds: number) => {
    if (!scrubbing) {
      setPosition(seconds)
    }
  }
  const preparePlayback = (seconds: number) => {
    invalidate()
    setPosition(seconds)
  }
  const previewPosition = (seconds: number) => {
    invalidate()
    if (!scrubbing) {
      previousPosition = position()
    }
    scrubbing = true
    setPosition(seconds)
  }
  const seek = async () => {
    const player = options.player()
    const target = position()
    const previous = previousPosition
    const currentRevision = (revision += 1)
    scrubbing = false
    if (player === undefined) {
      return
    }
    try {
      const isPlaying = await player.seek(target)
      if (currentRevision === revision && player === options.player()) {
        previousPosition = position()
        options.onSeekResult?.(isPlaying)
      }
    } catch (error: unknown) {
      if (currentRevision === revision && player === options.player()) {
        setPosition(previous)
        options.onSeekError(error)
      }
    }
  }
  return {
    cancelScrubbing,
    invalidate,
    position,
    preparePlayback,
    previewPosition,
    seek,
    updatePosition,
  }
}
