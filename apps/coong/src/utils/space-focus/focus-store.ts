import {measureLayout} from './measure-layout'

export interface IdRect extends Rect {
  id: string
}

export interface PreventMoveOptions {
  bottom?: boolean
  left?: boolean
  right?: boolean
  top?: boolean
}

export type Rect = {
  bottom: number
  cx: number
  // (left + right) / 2
  cy: number
  left: number
  right: number
  /// (top + bottom) / 2
  top: number
}

export type Direction = 'right' | 'left' | 'down' | 'up'

export interface FocusRect {
  children: Set<FocusRect>
  getRect: () => Rect | null
  id: string
  isDirty: boolean
  isInactive: boolean
  parent: FocusRect | null
  preventMove?: PreventMoveOptions
  rect: Rect | null
}

export interface FocusStore {
  readonly root: FocusRect
}

export const createFocusStore = (): FocusStore => {
  // string = groupLevel
  return {
    root: createFocusRect('root', null, () => null),
  }
}

export const createFocusRect = (
  id: string,
  parent: FocusRect | null,
  getRect: () => Rect | null,
  options?: {
    isInactive?: boolean
    preventMove?: PreventMoveOptions
  },
): FocusRect => {
  const {isInactive = false, preventMove} = options ?? {}

  const focusRect: FocusRect = {
    children: new Set(),
    getRect,
    id,
    isDirty: true,
    isInactive,
    parent,
    preventMove,
    rect: null,
  }

  return focusRect
}

export const recursivelyMarkDirty = (focusRect: FocusRect): void => {
  focusRect.isDirty = true
  focusRect.children.forEach(recursivelyMarkDirty)
}

export const getUpdatedRect = (rect: FocusRect): FocusRect => {
  if (rect.isDirty) {
    rect.rect = rect.getRect()
    rect.isDirty = false
  }

  return rect
}

export const getSiblingRects = (rect: FocusRect): Set<FocusRect> => {
  return rect.parent?.children ?? new Set()
}
