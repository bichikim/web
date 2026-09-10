import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {createSignal, createUniqueId} from 'solid-js'

import type {PSceneStyle} from '../../features/focus-room-animation/index'
import {PlayerIcon} from './PlayerIcon'
import {CLASSES} from './styles'

interface VolumeControlProps {
  readonly sceneStyle?: PSceneStyle
}

export const VolumeControl = (props: VolumeControlProps) => {
  const popoverId = `pomo-player-volume-${createUniqueId()}`
  const popoverAnchor = `--${popoverId}`
  const [popoverElement, setPopoverElement] = createSignal<HTMLElement>()
  const handleTriggerClick = (event: MouseEvent) => {
    event.preventDefault()
    const popover = popoverElement()

    if (popover === undefined) {
      return
    }

    if (popover.matches(':popover-open')) {
      popover.hidePopover()
      return
    }

    popover.showPopover()
  }

  return (
    <div class="pomo-player__volume-group flex min-w-0 items-center justify-end gap-0">
      <button
        aria-controls={popoverId}
        aria-haspopup="dialog"
        aria-label={m.player_volume()}
        class={cx(
          'pomo-player__volume-popover-trigger grid size-9 shrink-0 place-items-center',
          'rounded-full text-muted-foreground transition',
          'hover:bg-secondary-soft hover:text-foreground',
          '[anchor-name:var(--pomo-volume-popover-anchor)]',
        )}
        onClick={handleTriggerClick}
        popovertarget={popoverId}
        style={{'--pomo-volume-popover-anchor': popoverAnchor}}
        type="button"
      >
        <PlayerIcon icon="i-tabler-volume-2" sceneStyle={props.sceneStyle} size="size-6" />
      </button>

      <div
        aria-label={m.player_volume()}
        class={cx(
          'pomo-player__volume-popover fixed inset-auto m-0 mt-1 box-border',
          'border border-solid border-border rounded-control bg-surface-interactive p-2',
          'text-foreground shadow-panel',
          '[position-area:bottom]',
          '[position-anchor:var(--pomo-volume-popover-anchor)]',
        )}
        id={popoverId}
        popover="auto"
        ref={setPopoverElement}
        role="dialog"
        style={{'--pomo-volume-popover-anchor': popoverAnchor}}
      >
        <media-volume-range
          aria-label={m.player_volume()}
          attr:autofocus=""
          class={CLASSES.playerVolumePopover}
        />
      </div>
    </div>
  )
}
