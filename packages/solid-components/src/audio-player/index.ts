import {freeze} from '@winter-love/utils'

import {AudioPlayerMedia} from './AudioPlayerMedia'
import {AudioPlayerMuteButton} from './AudioPlayerMuteButton'
import {AudioPlayerPlayButton} from './AudioPlayerPlayButton'
import {AudioPlayerRoot} from './AudioPlayerRoot'
import {AudioPlayerTime} from './AudioPlayerTime'
import {AudioPlayerTimeRange} from './AudioPlayerTimeRange'

export * from './AudioPlayerMedia'
export * from './AudioPlayerMuteButton'
export * from './AudioPlayerPlayButton'
export * from './AudioPlayerRoot'
export * from './AudioPlayerTime'
export * from './AudioPlayerTimeRange'
export * from './context'

export const AudioPlayer = freeze({
  Media: AudioPlayerMedia,
  MuteButton: AudioPlayerMuteButton,
  PlayButton: AudioPlayerPlayButton,
  Root: AudioPlayerRoot,
  Time: AudioPlayerTime,
  TimeRange: AudioPlayerTimeRange,
})
