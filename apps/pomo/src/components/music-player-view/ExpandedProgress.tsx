import {cx} from 'class-variance-authority'
import {CLASSES, MusicPlayerViewProps} from './shared'

const MEDIA_FOCUS_CLASSES =
  'focus-visible:outline-none [--media-focus-box-shadow:inset_0_0_0_2px_#727b60]'

export const ExpandedPlayerProgress = (props: Pick<MusicPlayerViewProps, 'expanded'>) => (
  <media-time-range
    aria-hidden={props.expanded ? undefined : 'true'}
    aria-label="재생 위치 조절"
    class={cx(
      CLASSES.playerProgress,
      CLASSES.playerProgressExpanded,
      MEDIA_FOCUS_CLASSES,
      props.expanded && 'is-expanded',
      !props.expanded && 'pointer-events-none cursor-default [--media-cursor:default]',
    )}
    bool:disabled={!props.expanded}
    title="재생 위치 조절"
  />
)
