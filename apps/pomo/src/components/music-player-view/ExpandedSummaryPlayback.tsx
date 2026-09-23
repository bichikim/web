import {SummaryPlayButton} from './SummaryPlayButton'
import type {MusicPlayerViewProps} from './types'
import {TrackArtwork} from './TrackArtwork'

export interface ExpandedSummaryPlaybackProps extends Pick<
  MusicPlayerViewProps,
  'currentTrack' | 'isPlaying' | 'sceneStyle'
> {
  readonly isPreparing?: boolean
  readonly onPause?: () => void
}

export const ExpandedSummaryPlayback = (props: ExpandedSummaryPlaybackProps) => (
  <>
    <TrackArtwork currentTrack={props.currentTrack} />
    <div class="hidden size-11 shrink-0 player-compact:block">
      <SummaryPlayButton
        isPreparing={props.isPreparing}
        isPlaying={props.isPlaying}
        currentTrack={props.currentTrack}
        onPause={props.onPause}
        sceneStyle={props.sceneStyle}
      />
    </div>
  </>
)
