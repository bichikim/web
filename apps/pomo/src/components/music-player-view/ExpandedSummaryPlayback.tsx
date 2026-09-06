import {SummaryPlayButton} from './SummaryPlayButton'
import {type MusicPlayerViewProps} from './shared'
import {TrackArtwork} from './TrackArtwork'

export const ExpandedSummaryPlayback = (
  props: Pick<MusicPlayerViewProps, 'currentTrack' | 'sceneStyle'>,
) => (
  <>
    <TrackArtwork currentTrack={props.currentTrack} />
    <div class="pomo-player__compact-summary-play hidden size-11 shrink-0 player-compact:block">
      <SummaryPlayButton currentTrack={props.currentTrack} sceneStyle={props.sceneStyle} />
    </div>
  </>
)
