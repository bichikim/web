import {useTooltipTrigger} from '../tooltip'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'
import {useSwipeTrackGesture} from './use-swipe-track-gesture'

import type {PTrack} from '../../features/focus-room-audio'
import {POverflowMarquee} from '../POverflowMarquee'
import {PTooltip} from '../PTooltip'

const TRACK_CLASSES = cx(
  'pomo-player__track text-muted-foreground',
  "[&[aria-current='true']]:text-foreground",
  "[&[aria-current='true']]:shadow-track-active",
  '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid',
  '[&:focus-visible]:outline-primary [&:focus-visible]:[outline-offset:0.125rem]',
)

export interface PSwipeTrackItemProps {
  readonly current: boolean
  readonly index: number
  readonly onRemove?: () => void
  readonly onSelect: () => void
  readonly track: PTrack
}

export const PSwipeTrackItem = (props: PSwipeTrackItemProps) => {
  const tooltip = useTooltipTrigger()

  const removable = () => props.onRemove !== undefined
  const gesture = useSwipeTrackGesture({enabled: removable, onRemove: () => props.onRemove?.()})
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    gesture.handleClick(event)
    if (event.defaultPrevented) {
      return
    }
    props.onSelect()
  }
  const handleKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    if (event.key !== 'Delete' || !removable()) {
      return
    }
    event.preventDefault()
    props.onRemove?.()
  }

  return (
    <li
      class="pomo-player__swipe-track relative min-w-0 overflow-clip rounded-3"
      style={{'--pomo-swipe-offset': `${gesture.offset()}px`}}
    >
      <div
        aria-hidden="true"
        class="pomo-player__track-delete-start pointer-events-none absolute inset-y-0 left-0 grid
          place-items-center overflow-hidden text-danger w-[max(0px,var(--pomo-swipe-offset))]"
      >
        <span
          class={
            gesture.deleteReady()
              ? 'i-tabler-trash size-5 flex-none scale-110'
              : 'i-tabler-trash size-5 flex-none'
          }
        />
      </div>
      <div
        aria-hidden="true"
        class="pomo-player__track-delete-end pointer-events-none absolute inset-y-0 right-0 grid
          place-items-center overflow-hidden text-danger
          w-[max(0px,calc(-1*var(--pomo-swipe-offset)))]"
      >
        <span
          class={
            gesture.deleteReady()
              ? 'i-tabler-trash size-5 flex-none scale-110'
              : 'i-tabler-trash size-5 flex-none'
          }
        />
      </div>

      <button
        aria-current={props.current ? 'true' : undefined}
        aria-keyshortcuts={removable() ? 'Delete' : undefined}
        aria-label={`${props.track.title} · ${props.track.artist}${removable() ? ' · 밀어서 삭제' : ''}`}
        class={cx(
          TRACK_CLASSES,
          'group box-border flex min-w-0 w-full touch-pan-y select-none items-center',
          '[transform:translateX(var(--pomo-swipe-offset))]',
          'rounded-3 gap-3 player-compact:gap-2 px-3 py-2 text-left text-sm leading-5',
          'player-compact:px-2 player-compact:py-1.5',
          gesture.dragging()
            ? 'transition-none'
            : 'transition-[transform,background-color,color] duration-180 ease-out',
          props.current
            ? 'bg-primary-soft text-foreground'
            : 'text-muted-foreground hover:bg-secondary-soft',
        )}
        data-swipe-delete-ready={gesture.deleteReady() ? '' : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onLostPointerCapture={gesture.handleLostPointerCapture}
        onPointerCancel={gesture.handlePointerCancel}
        onPointerDown={gesture.handlePointerDown}
        onPointerMove={gesture.handlePointerMove}
        onPointerUp={gesture.handlePointerUp}
        type="button"
      >
        <span class="w-4 text-center tabular-nums">{props.index + 1}</span>
        <span {...tooltip.events} ref={tooltip.setTarget} class="min-w-0 flex-1">
          <Show
            fallback={<span class="block truncate">{props.track.title}</span>}
            when={props.current}
          >
            <POverflowMarquee focusable={false} text={props.track.title} />
          </Show>
        </span>
        <Show
          fallback={
            <span class="min-w-0 w-22 shrink-0 truncate opacity-70">{props.track.artist}</span>
          }
          when={props.current}
        >
          <POverflowMarquee
            class="w-22 shrink-0 opacity-70"
            focusable={false}
            text={props.track.artist}
          />
        </Show>
      </button>
      <PTooltip target={tooltip.target()} show={tooltip.show()} text={props.track.title} />

      <span aria-live="polite" class="sr-only">
        {gesture.deleteReady() ? `${props.track.title}, 놓으면 삭제` : ''}
      </span>
    </li>
  )
}
