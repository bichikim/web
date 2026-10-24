import {createContext, useContext} from 'solid-js'
import type {PlayerState} from './types'

export interface MediaPlayerControls extends PlayerState {
  readonly play: () => void
  readonly pause: () => void
  readonly seek: (seconds: number) => void
}
export const MediaPlayerContext = createContext<MediaPlayerControls>()

/** 현재 MediaPlayer의 재생 상태와 목록 조작을 제공한다. */
export const useMediaPlayer = (): MediaPlayerControls => {
  const player = useContext(MediaPlayerContext)
  if (player === undefined) {
    throw new Error('useMediaPlayer requires a MediaPlayer ancestor')
  }
  return player
}
