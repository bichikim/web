import {cx} from 'class-variance-authority'
import {getPomoIconClass} from '../icon-style'
import type {PSceneStyle} from '../../features/focus-room-animation/index'

interface PlayerIconProps {
  readonly icon: string
  readonly sceneStyle?: PSceneStyle
  readonly size: 'size-4' | 'size-5'
  readonly slot?: string
}

export const PlayerIcon = (props: PlayerIconProps) => (
  <span
    aria-hidden="true"
    class={cx(getPomoIconClass(props.icon, props.sceneStyle), props.size)}
    slot={props.slot}
  />
)
