import {cx} from 'class-variance-authority'
import type {PSceneStyle} from '../../features/focus-room-animation/index'
import {FeedStatusFrame} from './Frame'
import {CLASSES, FeedStatusFrameProps} from './shared'

interface FeedStatusSurfaceProps extends FeedStatusFrameProps {
  readonly state: string
}

const getFeedStatusShapeClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-0' : 'rounded-2xl border border-solid'

export const FeedStatusSurface = (props: FeedStatusSurfaceProps) => (
  <FeedStatusFrame sceneStyle={props.sceneStyle}>
    <div
      aria-live="polite"
      class={cx(
        CLASSES.feedStatus,
        getFeedStatusShapeClasses(props.sceneStyle),
        'border-highlight bg-surface-interactive',
      )}
      data-state={props.state}
      role="status"
    >
      {props.children}
    </div>
  </FeedStatusFrame>
)
