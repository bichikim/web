import {freeze} from '@winter-love/utils'

import {AudioPlayerMedia} from './Media'
import {AudioPlayerMuteButton} from './MuteButton'
import {AudioPlayerPlayButton} from './PlayButton'
import {AudioPlayerRoot} from './Root'
import {AudioPlayerTime} from './Time'
import {AudioPlayerTimeRange} from './TimeRange'

export * from './Media'
export * from './MuteButton'
export * from './PlayButton'
export * from './Root'
export * from './Time'
export * from './TimeRange'
export * from './context'

export const AudioPlayer = freeze({
  Media: AudioPlayerMedia,
  MuteButton: AudioPlayerMuteButton,
  PlayButton: AudioPlayerPlayButton,
  Root: AudioPlayerRoot,
  Time: AudioPlayerTime,
  TimeRange: AudioPlayerTimeRange,
})
