import {createFocusRect, type Direction, FocusRect, getSiblingRects} from './focus-store'
import {jumpFocus} from './focus-candidate'

export interface FocusController {
  readonly focusRootRect: FocusRect
  readonly moveFocus: (direction: Direction) => FocusRect | null
  readonly setFocus: (rect: FocusRect | null) => void
}

export const createFocusController = (
  onCallback: (rect: FocusRect, focused: boolean) => void,
): FocusController => {
  const rootRect = createFocusRect('root', null, () => null)
  let currentRect: FocusRect | null = null

  const onChange = (rect: FocusRect | null) => {
    if (rect === null) {
      if (currentRect) {
        onCallback(currentRect, false)
        currentRect = null
      }

      return
    }

    if (rect.id === currentRect?.id) {
      return
    }

    if (currentRect) {
      onCallback(currentRect, false)
    }

    currentRect = rect
    onCallback(rect, true)
  }

  const _moveFocus = (direction: Direction) => {
    if (!currentRect) {
      return null
    }

    const siblingRects = getSiblingRects(currentRect)

    const nextRect = jumpFocus(currentRect, [...siblingRects], direction)

    if (nextRect) {
      onChange(nextRect)
    }

    return currentRect
  }

  const _setFocus = (rect: FocusRect | null) => {
    onChange(rect)
  }

  return {
    focusRootRect: rootRect,
    moveFocus: _moveFocus,
    setFocus: _setFocus,
  }
}
