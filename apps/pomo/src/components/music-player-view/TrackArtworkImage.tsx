import {createSignal} from 'solid-js'

export interface TrackArtworkImageProps {
  readonly source: string
}

export const TrackArtworkImage = (props: TrackArtworkImageProps) => {
  const [failed, setFailed] = createSignal(false)
  const handleError = () => setFailed(true)
  return (
    <img
      alt=""
      class="pomo-player__artwork size-11 shrink-0 rounded-control object-cover player-compact:hidden"
      hidden={failed()}
      onError={handleError}
      src={props.source}
    />
  )
}
