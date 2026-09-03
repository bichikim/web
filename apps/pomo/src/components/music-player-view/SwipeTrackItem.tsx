import {cx} from 'class-variance-authority'
import {createSignal, type JSX, onCleanup, Show} from 'solid-js'

import type {PTrack} from '../../features/focus-room-audio'
import {POverflowMarquee} from '../POverflowMarquee'

const DELETE_COMMIT_DISTANCE = 64
const DRAG_INTENT_DISTANCE = 8
const MAX_SWIPE_DISTANCE = 80

const TRACK_CLASSES = cx(
  'pomo-player__track text-muted-foreground',
  "[&[aria-current='true']]:text-foreground",
  "[&[aria-current='true']]:shadow-track-active",
  '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid',
  '[&:focus-visible]:outline-primary [&:focus-visible]:[outline-offset:2px]',
)

const releasePointer = (element: HTMLButtonElement, pointerId: number) => {
  if (element.hasPointerCapture?.(pointerId)) {
    element.releasePointerCapture(pointerId)
  }
}

const useSwipeTrackGesture = (enabled: () => boolean, onRemove: () => void) => {
  let activePointerId: number | undefined
  let gestureAxis: 'horizontal' | 'pending' | 'vertical' = 'pending'
  let startX = 0
  let startY = 0
  let suppressClick = false
  const [dragging, setDragging] = createSignal(false)
  const [offset, setOffset] = createSignal(0)
  const deleteReady = () => Math.abs(offset()) >= DELETE_COMMIT_DISTANCE

  const resetSwipe = () => {
    activePointerId = undefined
    gestureAxis = 'pending'
    setDragging(false)
    setOffset(0)
  }

  const handlePointerDown: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> = (event) => {
    if (!enabled() || event.button !== 0) {
      return
    }

    activePointerId = event.pointerId
    gestureAxis = 'pending'
    startX = event.clientX
    startY = event.clientY
    suppressClick = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId || gestureAxis === 'vertical') {
      return
    }

    const horizontalDistance = event.clientX - startX
    const verticalDistance = event.clientY - startY

    if (gestureAxis === 'pending') {
      if (
        Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < DRAG_INTENT_DISTANCE
      ) {
        return
      }

      gestureAxis =
        Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'horizontal' : 'vertical'

      if (gestureAxis === 'vertical') {
        activePointerId = undefined
        releasePointer(event.currentTarget, event.pointerId)
        return
      }
    }

    event.preventDefault()
    suppressClick = true
    setDragging(true)
    setOffset(
      Math.sign(horizontalDistance) * Math.min(Math.abs(horizontalDistance), MAX_SWIPE_DISTANCE),
    )
  }

  const handlePointerUp: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    const shouldRemove = gestureAxis === 'horizontal' && deleteReady()
    resetSwipe()
    releasePointer(event.currentTarget, event.pointerId)
    if (shouldRemove) {
      onRemove()
    }
  }

  const handlePointerCancel: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    suppressClick = gestureAxis === 'horizontal'
    resetSwipe()
    releasePointer(event.currentTarget, event.pointerId)
  }

  const handleLostPointerCapture: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> = (
    event,
  ) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    suppressClick = gestureAxis === 'horizontal'
    resetSwipe()
  }

  const handleClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = (event) => {
    if (!suppressClick) {
      return
    }

    event.preventDefault()
    suppressClick = false
  }

  onCleanup(() => {
    activePointerId = undefined
  })

  return {
    deleteReady,
    dragging,
    handleClick,
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    offset,
  }
}

export interface PSwipeTrackItemProps {
  readonly current: boolean
  readonly index: number
  readonly onRemove?: () => void
  readonly onSelect: () => void
  readonly track: PTrack
}

export const PSwipeTrackItem = (props: PSwipeTrackItemProps) => {
  const removable = () => props.onRemove !== undefined
  const gesture = useSwipeTrackGesture(removable, () => props.onRemove?.())

  return (
    <li class="relative min-w-0 overflow-clip rounded-3">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-0 grid place-items-center overflow-hidden
          text-danger"
        style={{width: `${Math.max(0, gesture.offset())}px`}}
      >
        <span
          class={
            gesture.deleteReady() ? 'i-tabler-trash size-5 scale-110' : 'i-tabler-trash size-5'
          }
        />
      </div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-0 grid place-items-center
          overflow-hidden text-danger"
        style={{width: `${Math.max(0, -gesture.offset())}px`}}
      >
        <span
          class={
            gesture.deleteReady() ? 'i-tabler-trash size-5 scale-110' : 'i-tabler-trash size-5'
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
        onClick={(event) => {
          gesture.handleClick(event)
          if (event.defaultPrevented) {
            return
          }

          props.onSelect()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Delete' || !removable()) {
            return
          }

          event.preventDefault()
          props.onRemove?.()
        }}
        onLostPointerCapture={gesture.handleLostPointerCapture}
        onPointerCancel={gesture.handlePointerCancel}
        onPointerDown={gesture.handlePointerDown}
        onPointerMove={gesture.handlePointerMove}
        onPointerUp={gesture.handlePointerUp}
        style={{
          transform: gesture.offset() === 0 ? undefined : `translateX(${gesture.offset()}px)`,
        }}
        type="button"
      >
        <span class="w-4 text-center tabular-nums">{props.index + 1}</span>
        <Show
          fallback={<span class="min-w-0 flex-1 truncate">{props.track.title}</span>}
          when={props.current}
        >
          <POverflowMarquee class="flex-1" focusable={false} text={props.track.title} />
        </Show>
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
      <span aria-live="polite" class="sr-only">
        {gesture.deleteReady() ? `${props.track.title}, 놓으면 삭제` : ''}
      </span>
    </li>
  )
}
