import {Accessor, type JSX, untrack} from 'solid-js'

const DEFAULT_DOUBLE_CLICK_GAP = 250
export interface DoubleClickPayload {
  active: boolean
  doubleClickGap?: number
  onClick?: (event: MouseEvent | TouchEvent) => void
  onDoubleClick?: (event: MouseEvent | TouchEvent) => void
  onLoading: (value: boolean) => void
  onTouchEnd?: (event: TouchEvent) => void
  onTouchStart?: (event: TouchEvent) => void
}

export const useDoubleClick = (payload: Accessor<DoubleClickPayload>) => {
  let clickTime = 0
  let touchdown = false

  const handleClick: (
    event: MouseEvent | TouchEvent,
    useTouchEvent?: boolean,
  ) => Promise<void> = async (event: any, useTouchEvent = false) => {
    const {
      active,
      onClick,
      onDoubleClick,
      onLoading,
      doubleClickGap = DEFAULT_DOUBLE_CLICK_GAP,
    } = untrack(() => payload())

    if (!active || (event.pointerType === 'touch' && !useTouchEvent)) {
      return
    }

    // only run double logic when onDoubleClick is provided
    if (onDoubleClick) {
      const nextClickTime = Date.now()

      if (nextClickTime - clickTime < doubleClickGap) {
        onLoading(true)
        await onDoubleClick(event)
        onLoading(false)

        return
      }

      clickTime = nextClickTime
    }

    if (onClick) {
      onLoading(true)
      await onClick(event)
      onLoading(false)
    }
  }

  const handleTouchStart: JSX.EventHandler<HTMLElement, TouchEvent> = (event: any) => {
    const {onTouchStart} = untrack(() => payload())

    onTouchStart?.(event)
    touchdown = true
  }

  const handleTouchEnd: JSX.EventHandler<HTMLElement, TouchEvent> = (event: any) => {
    const {onTouchEnd} = untrack(() => payload())

    onTouchEnd?.(event)

    if (touchdown) {
      handleClick(event, true)
    }

    touchdown = false
  }

  return {
    handleClick,
    handleTouchEnd,
    handleTouchStart,
  }
}
