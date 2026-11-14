import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PlayButton} from './PlayButton'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'

export interface SummaryPlayButtonProps extends Pick<
  MusicPlayerViewProps,
  'currentTrack' | 'isPlaying' | 'sceneStyle'
> {
  readonly isPreparing?: boolean
  readonly onPause?: () => void
}

export const SummaryPlayButton = (props: SummaryPlayButtonProps) => (
  <div class={CLASSES.playerPlaySummaryFrame} data-player-play-summary-frame="">
    <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
      <PlayButton
        hasTrack={props.currentTrack !== undefined}
        isPlaying={props.isPlaying}
        isPreparing={props.isPreparing}
        onPause={props.onPause}
        sceneStyle={props.sceneStyle}
      />
    </PScribbleCircleControl>
  </div>
)
