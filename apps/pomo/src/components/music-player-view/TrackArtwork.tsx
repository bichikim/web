import {Show} from 'solid-js'
import type {MusicPlayerViewProps} from './types'
import {TrackArtworkImage} from './TrackArtworkImage'

export interface TrackArtworkProps extends Pick<MusicPlayerViewProps, 'currentTrack'> {}

export const TrackArtwork = (props: TrackArtworkProps) => (
  <Show keyed when={props.currentTrack?.artworkUrl}>
    {(source) => <TrackArtworkImage source={source} />}
  </Show>
)
