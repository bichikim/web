import {type JSX, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export type AudioPlayerTimeKind = 'current' | 'duration'

export interface AudioPlayerTimeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  readonly format?: (time: number) => string
  readonly kind?: AudioPlayerTimeKind
}

const SECONDS_PER_MINUTE = 60

const formatTime = (time: number): string => {
  const wholeSeconds = Math.max(0, Math.floor(time))
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE)
  const seconds = wholeSeconds % SECONDS_PER_MINUTE

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export const AudioPlayerTime = (props: AudioPlayerTimeProps) => {
  const [state] = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, ['children', 'format', 'kind'])
  const value = () => (localProps.kind === 'duration' ? state().duration : state().currentTime)

  return <span {...restProps}>{(localProps.format ?? formatTime)(value())}</span>
}
