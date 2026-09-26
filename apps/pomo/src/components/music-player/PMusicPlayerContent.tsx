import {useOptionalSoundEffects} from '../../features/sound-effects'
import {MediaPlayer} from '../media-player'
import type {PMusicPlayerContentProps} from './types'
import {PMusicPlayerPresentation} from './PMusicPlayerPresentation'

export function PMusicPlayerContent(props: PMusicPlayerContentProps) {
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
      />
    </MediaPlayer>
  )
}
