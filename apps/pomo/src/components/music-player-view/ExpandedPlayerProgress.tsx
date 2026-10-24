import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'
import {TOOLTIP_SURFACE_CLASSES} from '../tooltip'

const MEDIA_FOCUS_CLASSES =
  'focus-visible:outline-none [--media-focus-box-shadow:inset_0_0_0_0.125rem_#727b60]'

export interface ExpandedPlayerProgressProps extends Pick<MusicPlayerViewProps, 'expanded'> {}

export const ExpandedPlayerProgress = (props: ExpandedPlayerProgressProps) => (
  <media-time-range
    aria-hidden={props.expanded ? undefined : 'true'}
    aria-label={m.player_seek()}
    class={cx(
      CLASSES.playerProgress,
      CLASSES.playerProgressExpanded,
      MEDIA_FOCUS_CLASSES,
      props.expanded && 'is-expanded',
      !props.expanded && 'pointer-events-none cursor-default [--media-cursor:default]',
    )}
    bool:disabled={!props.expanded}
  >
    <span class={cx(TOOLTIP_SURFACE_CLASSES, 'block whitespace-nowrap')} slot="preview">
      <media-preview-time-display class="[font:inherit] text-inherit bg-transparent p-0" />
    </span>
  </media-time-range>
)
