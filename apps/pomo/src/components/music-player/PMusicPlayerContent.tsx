import {MediaPlayer} from '../media-player'
import type {PMusicPlayerContentProps} from './types'
import {PMusicPlayerPresentation} from './PMusicPlayerPresentation'

export function PMusicPlayerContent(props: PMusicPlayerContentProps) {
  return (
    <MediaPlayer {...props} class="contents [&::part(vertical-layer)]:contents">
      <PMusicPlayerPresentation
        expanded={props.expanded}
        onExpandedChange={props.onExpandedChange}
        sceneStyle={props.sceneStyle}
      />
    </MediaPlayer>
  )
}
