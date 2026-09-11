import {formatDuration} from 'src/utils/format-duration'
import {type JSX, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export type AudioPlayerTimeKind = 'current' | 'duration'

export interface AudioPlayerTimeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  readonly format?: (time: number) => string
  readonly kind?: AudioPlayerTimeKind
}

const MILLISECONDS_PER_SECOND = 1000

const formatTime = (time: number): string =>
  formatDuration(Math.max(0, Math.floor(time)) * MILLISECONDS_PER_SECOND)

export const AudioPlayerTime = (props: AudioPlayerTimeProps) => {
  const [state] = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, ['children', 'format', 'kind'])
  const value = () => (localProps.kind === 'duration' ? state().duration : state().currentTime)

  return <span {...restProps}>{(localProps.format ?? formatTime)(value())}</span>
}
