import {SummaryPlayButton} from './SummaryPlayButton'
import type {MusicPlayerViewProps} from './types'
import {TrackArtwork} from './TrackArtwork'

export interface ExpandedSummaryPlaybackProps extends Pick<
  MusicPlayerViewProps,
  'currentTrack' | 'isPlaying' | 'sceneStyle'
> {}

export const ExpandedSummaryPlayback = (props: ExpandedSummaryPlaybackProps) => (
  <>
    <TrackArtwork currentTrack={props.currentTrack} />
    <div class="pomo-player__compact-summary-play hidden size-11 shrink-0 player-compact:block">
      <SummaryPlayButton
        isPlaying={props.isPlaying}
        currentTrack={props.currentTrack}
        sceneStyle={props.sceneStyle}
      />
    </div>
  </>
)
