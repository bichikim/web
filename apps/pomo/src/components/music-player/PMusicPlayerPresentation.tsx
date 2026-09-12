import {createSignal} from 'solid-js'
import {useMediaPlayer} from '../media-player/context'
import {MusicPlayerView} from '../MusicPlayerView'
import type {PMusicPlayerContentProps} from './types'

export interface PMusicPlayerPresentationProps extends Pick<
  PMusicPlayerContentProps,
  'expanded' | 'onExpandedChange' | 'sceneStyle'
> {}

export function PMusicPlayerPresentation(props: PMusicPlayerPresentationProps) {
  const player = useMediaPlayer()
  const [internalExpanded, setInternalExpanded] = createSignal(false)
  const expanded = () => props.expanded ?? internalExpanded()
  const handleExpandedChange = () => {
    const nextExpanded = !expanded()
    if (props.expanded === undefined) {
      setInternalExpanded(nextExpanded)
    }
    props.onExpandedChange?.(nextExpanded)
  }

  return (
    <MusicPlayerView
      currentIndex={player.currentIndex()}
      currentTrack={player.currentTrack()}
      expanded={expanded()}
      isPlaying={player.isPlaying()}
      levels={player.levels()}
      onAlbumAdd={player.addTracksToQueue}
      onAlbumClear={player.canEditQueue() ? player.clearTrackQueue : undefined}
      onExpandedChange={handleExpandedChange}
      onNextTrack={player.selectNextTrack}
      onPreviousTrack={player.selectPreviousTrack}
      onPreviewEnd={player.previewPlayback.finish}
      onPreviewStart={player.previewPlayback.start}
      onRepeatModeChange={player.toggleRepeatMode}
      onShuffleChange={player.toggleShuffle}
      onTrackRemove={player.canEditQueue() ? player.removeTrackFromQueue : undefined}
      onTrackSelect={player.selectChosenTrack}
      repeatMode={player.repeatMode()}
      sceneStyle={props.sceneStyle}
      shuffleEnabled={player.shuffleEnabled()}
      tracks={player.tracks()}
    />
  )
}
