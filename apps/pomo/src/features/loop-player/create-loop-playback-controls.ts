import {createSignal} from 'solid-js'
import type {LoopPlayback} from './player'

interface LoopPlaybackControlsOptions {
  readonly player: () => LoopPlayback | undefined
  readonly onSeekError: (error: unknown) => void
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
      await player.seek(target)
      if (currentRevision === revision && player === options.player()) {
        previousPosition = position()
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
