import {MusicPlayerView} from '../MusicPlayerView'
import type {PMusicPlayerContentProps} from './model'
import {useMusicPlayerController} from './use-music-player-controller'

export default function PMusicPlayerContent(props: PMusicPlayerContentProps) {
  const player = useMusicPlayerController(props)

  return (
    <MusicPlayerView
      currentIndex={player.currentIndex()}
      currentTrack={player.currentTrack()}
      expanded={player.expanded()}
      isPlaying={player.isPlaying()}
      levels={player.levels()}
      onAudioElement={player.setAudioElement}
      onAlbumAdd={player.addTracksToQueue}
      onAlbumClear={player.canEditQueue() ? player.clearTrackQueue : undefined}
      onExpandedChange={player.toggleExpanded}
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
