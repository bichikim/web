import {createEffect, createMemo, createSignal} from 'solid-js'
import type {MemoSwipe, MemoSwipePosition, MemoSwipeStart, UseMemoSwipeProps} from './types'

export const useMemoSwipe = (props: UseMemoSwipeProps = {}): MemoSwipe => {
  const [dragging, setDragging] = createSignal(false)
  const [pending, setPending] = createSignal(false)
  const [resetRevision, setResetRevision] = createSignal(0)
  const blocked = createMemo(() => (props.disabled?.() ?? false) || pending())
  let pointer: MemoSwipeStart | null = null
  let armed = false
  const cancel = (): void => {
    pointer = null
    armed = false
    setDragging(false)
    setResetRevision((revision) => revision + 1)
  }
  createEffect(() => {
    if (props.disabled?.()) {
      cancel()
    }
  })
  const finish = async (position: MemoSwipePosition): Promise<void> => {
    const thresholdRatio = 0.8
    cancel()
    if (
      blocked() ||
      position.extent === 0 ||
      Math.abs(position.offset) < position.extent * thresholdRatio
    ) {
      return
    }
    const action = position.offset > 0 ? props.onAttach : props.onRemove
    if (action !== undefined) {
      setPending(true)
      try {
        await action()
      } finally {
        setPending(false)
      }
    }
  }
  const startPointer: MemoSwipe['startPointer'] = (point) => {
    if (blocked()) {
      return false
    }
    armed = false
    pointer = point
    return true
  }
  const movePointer: MemoSwipe['movePointer'] = (point) => {
    if (pointer === null || pointer.pointer !== point.pointer || blocked()) {
      return null
    }
    const horizontal = point.x - pointer.x
    const vertical = point.y - pointer.y
    const dragThreshold = 6
    const capture = !dragging()
    if (capture) {
      if (Math.abs(vertical) > Math.max(dragThreshold, Math.abs(horizontal))) {
        cancel()
        return null
      }
      if (Math.abs(horizontal) < dragThreshold) {
        return null
      }
      setDragging(true)
    }
    return {capture, offset: pointer.offset - horizontal}
  }
  const endPointer: MemoSwipe['endPointer'] = async (position) => {
    if (pointer?.pointer === position.pointer) {
      await finish(position)
    }
  }
  const cancelPointer: MemoSwipe['cancelPointer'] = (identity) => {
    if (pointer?.pointer === identity) {
      cancel()
    }
  }
  const wheel: MemoSwipe['wheel'] = (input) => {
    armed =
      !blocked() &&
      !dragging() &&
      !input.zoom &&
      Math.abs(input.horizontal) > Math.abs(input.vertical)
  }
  const startTouch: MemoSwipe['startTouch'] = (input) => {
    armed = !blocked() && !dragging() && input.touches === 1 && !input.interactive
  }
  const endTouch: MemoSwipe['endTouch'] = (input) => {
    if (input.remaining > 0 || input.centered) {
      armed = false
    }
  }
  const endNative: MemoSwipe['endNative'] = async (position) => {
    if (!blocked() && !dragging()) {
      if (armed) {
        await finish(position)
      } else {
        cancel()
      }
    }
  }
  return {
    blocked,
    cancel,
    cancelPointer,
    dragging,
    endNative,
    endPointer,
    endTouch,
    movePointer,
    pending,
    resetRevision,
    startPointer,
    startTouch,
    wheel,
  }
}
