import type {PSceneStyle} from '../features/focus-room-animation'
import {getPrimaryMoodIcon, type PrimaryMoodId} from '../features/text-mood'

export interface PFaceIconProps {
  readonly alt: string
  readonly class?: string
  readonly mood: PrimaryMoodId
  readonly sceneStyle?: PSceneStyle
}

export const PFaceIcon = (props: PFaceIconProps) => (
  <img
    alt={props.alt}
    aria-hidden={props.alt === '' ? 'true' : undefined}
    class={props.class}
    src={getPrimaryMoodIcon(props.mood, props.sceneStyle)}
  />
)
