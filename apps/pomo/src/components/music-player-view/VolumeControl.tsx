import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {createSignal, createUniqueId, onCleanup, onMount} from 'solid-js'

import type {PSceneStyle} from '../../features/focus-room-animation/index'
import {PlayerIcon} from './Icon'
import {CLASSES} from './shared'

interface VolumeControlProps {
  readonly sceneStyle?: PSceneStyle
}

export const VolumeControl = (props: VolumeControlProps) => {
  const popoverId = `pomo-player-volume-${createUniqueId()}`
  const popoverAnchor = `--${popoverId}`
  const [popoverElement, setPopoverElement] = createSignal<HTMLElement>()
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement>()
  const handleTriggerClick = () => {
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

  onMount(() => {
    const popover = popoverElement()
    const trigger = triggerElement()

    if (popover === undefined || trigger === undefined) {
      return
    }

    const handleResize = () => {
      const triggerHidden = getComputedStyle(trigger).display === 'none'

      if (triggerHidden && popover.matches(':popover-open')) {
        popover.hidePopover()
      }
    }

    window.addEventListener('resize', handleResize)
    onCleanup(() => window.removeEventListener('resize', handleResize))
  })

  return (
    <div class="pomo-player__volume-group flex min-w-0 items-center justify-end gap-0">
      <media-mute-button
        aria-label={m.player_toggle_mute()}
        class={cx(CLASSES.playerMute, 'player-narrow:hidden')}
        notooltip
      >
        <PlayerIcon
          icon="i-tabler-volume-off"
          sceneStyle={props.sceneStyle}
          size="size-6"
          slot="off"
        />
        <PlayerIcon
          icon="i-tabler-volume-4"
          sceneStyle={props.sceneStyle}
          size="size-6"
          slot="low"
        />
        <PlayerIcon
          icon="i-tabler-volume-2"
          sceneStyle={props.sceneStyle}
          size="size-6"
          slot="medium"
        />
        <PlayerIcon
          icon="i-tabler-volume"
          sceneStyle={props.sceneStyle}
          size="size-6"
          slot="high"
        />
      </media-mute-button>

      <media-volume-range
        aria-label={m.player_volume()}
        class={cx(CLASSES.playerVolume, 'player-narrow:hidden')}
      />

      <button
        aria-controls={popoverId}
        aria-haspopup="dialog"
        aria-label={m.player_volume()}
        class={cx(
          'pomo-player__volume-popover-trigger hidden size-9 shrink-0 place-items-center',
          'rounded-full text-muted-foreground transition',
          'hover:bg-secondary-soft hover:text-foreground',
          'player-narrow:grid',
          '[anchor-name:var(--pomo-volume-popover-anchor)]',
        )}
        onClick={(event) => {
          event.preventDefault()
          handleTriggerClick()
        }}
        popovertarget={popoverId}
        ref={setTriggerElement}
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
          autofocus
          class={CLASSES.playerVolumePopover}
        />
      </div>
    </div>
  )
}
