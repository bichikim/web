import {createEffect, createSignal, type JSX, onCleanup, onMount} from 'solid-js'
import {useTranslations} from './locale/use-translations'
import {useMemoSwipe} from './use-memo-swipe'
import type {MemoSwipePosition} from './types'

interface SMemoSwipeProps {
  readonly children?: JSX.Element
  readonly disabled?: boolean
  readonly onAttach?: () => Promise<void>
  readonly onRemove?: () => Promise<boolean>
}
const swipePosition = (element: HTMLDivElement): MemoSwipePosition => {
  const extent = element.firstElementChild?.clientWidth ?? 0
  return {extent, offset: element.scrollLeft - extent}
}
const centerSwipe = (element: HTMLDivElement): void => {
  element.scrollLeft = element.firstElementChild?.clientWidth ?? 0
}
const interactiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('button,input,a,textarea,select') !== null

export const SMemoSwipe = (props: SMemoSwipeProps) => {
  const t = useTranslations()
  const [container, setContainer] = createSignal<HTMLDivElement | null>(null)
  const swipe = useMemoSwipe({
    disabled: () => props.disabled ?? false,
    get onAttach() {
      return props.onAttach
    },
    get onRemove() {
      return props.onRemove
    },
  })
  createEffect(() => {
    swipe.resetRevision()
    const element = container()
    if (element !== null) {
      centerSwipe(element)
    }
  })
  onMount(() => {
    const element = container()
    if (element !== null && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => centerSwipe(element))
      observer.observe(element)
      onCleanup(() => observer.disconnect())
    }
  })
  const handleStart: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (
      event.pointerType === 'mouse' &&
      event.button === 0 &&
      event.isPrimary &&
      !interactiveTarget(event.target)
    ) {
      const accepted = swipe.startPointer({
        offset: swipePosition(event.currentTarget).offset,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      })
      if (accepted) {
        event.preventDefault()
      }
    }
  }
  const handleMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const motion = swipe.movePointer({pointer: event.pointerId, x: event.clientX, y: event.clientY})
    if (motion !== null) {
      if (motion.capture) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      event.currentTarget.scrollLeft = swipePosition(event.currentTarget).extent + motion.offset
    }
  }
  const handleEnd: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    swipe.endPointer({...swipePosition(event.currentTarget), pointer: event.pointerId})
  const handleCancel: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    swipe.cancelPointer(event.pointerId)
  const handleScrollEnd: JSX.EventHandler<HTMLDivElement, Event> = (event) =>
    swipe.endNative(swipePosition(event.currentTarget))
  const handleWheel: JSX.EventHandler<HTMLDivElement, WheelEvent> = (event) =>
    swipe.wheel({horizontal: event.deltaX, vertical: event.deltaY, zoom: event.ctrlKey})
  const handleTouchStart: JSX.EventHandler<HTMLDivElement, TouchEvent> = (event) =>
    swipe.startTouch({interactive: interactiveTarget(event.target), touches: event.touches.length})
  const handleTouchEnd: JSX.EventHandler<HTMLDivElement, TouchEvent> = (event) =>
    swipe.endTouch({
      centered: swipePosition(event.currentTarget).offset === 0,
      remaining: event.touches.length,
    })
  const handleKeyboard: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    if (event.key === 'Escape' && !event.isComposing) {
      swipe.cancel()
    }
  }
  return (
    <div
      role="group"
      aria-label={t('메모 작업')}
      class="flex min-w-0 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      classList={{
        'overflow-x-auto': !swipe.blocked(),
        'overflow-x-hidden': swipe.blocked(),
        'select-none': swipe.dragging(),
      }}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleCancel}
      onLostPointerCapture={handleCancel}
      onScrollEnd={handleScrollEnd}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={swipe.cancel}
      onKeyDown={handleKeyboard}
      ref={setContainer}
    >
      <span
        aria-hidden="true"
        class="flex w-20 shrink-0 items-center justify-center bg-change-deleted text-sm text-action-text"
      >
        {t('삭제')}
      </span>
      <div class="flex w-full min-w-0 shrink-0 items-start gap-2 py-1.5">{props.children}</div>
      <span
        aria-hidden="true"
        class="flex w-20 shrink-0 items-center justify-center bg-accent text-xs text-action-text"
      >
        {t('채팅에 추가')}
      </span>
    </div>
  )
}
