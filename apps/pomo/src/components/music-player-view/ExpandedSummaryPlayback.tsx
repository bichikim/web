import {SummaryPlayButton} from './SummaryPlayButton'
import {type MusicPlayerViewProps} from './shared'
import {TrackArtwork} from './TrackArtwork'

export const ExpandedSummaryPlayback = (
  props: Pick<MusicPlayerViewProps, 'currentTrack' | 'isPlaying' | 'sceneStyle'>,
) => (
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
