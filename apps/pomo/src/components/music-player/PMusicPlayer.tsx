import {useOptionalSoundEffects} from '../../features/sound-effects'
import {MediaPlayer} from '../media-player'
import type {PMusicPlayerProps} from './types'
import {PMusicPlayerPresentation} from './PMusicPlayerPresentation'

export function PMusicPlayer(props: PMusicPlayerProps) {
  const soundEffects = useOptionalSoundEffects()
  const handlePlayRequest = () => {
    if (soundEffects === undefined || soundEffects.isStopped()) {
      return
    }

    soundEffects.activate()
  }

  return (
    <MediaPlayer
      {...props}
      class="contents [&::part(vertical-layer)]:contents"
      onPlayRequest={soundEffects === undefined ? undefined : handlePlayRequest}
    >
      <PMusicPlayerPresentation
        backdropBlur={props.backdropBlur}
        expanded={props.expanded}
        onExpandedChange={props.onExpandedChange}
        onPlaybackActionsReady={props.onPlaybackActionsReady}
        sceneStyle={props.sceneStyle}
        soundEffectsVisible={props.soundEffectsVisible}
      />
    </MediaPlayer>
  )
}
