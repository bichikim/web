import {Show} from 'solid-js'
import {type MusicPlayerViewProps} from './shared'

export const TrackArtwork = (props: Pick<MusicPlayerViewProps, 'currentTrack'>) => (
  <Show keyed when={props.currentTrack?.artworkUrl}>
    {(artworkUrl) => (
      <img
        alt=""
        class="pomo-player__artwork size-11 shrink-0 rounded-control object-cover
          player-compact:hidden"
        onError={({currentTarget}) => {
          currentTarget.hidden = true
        }}
        src={artworkUrl}
      />
    )}
  </Show>
)
