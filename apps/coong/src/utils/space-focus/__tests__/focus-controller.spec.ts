import {describe, expect, it, vi} from 'vitest'
import {createFocusController} from '../focus-controller'
import {createFocusRect as createStoreFocusRect, type FocusRect, type Rect} from '../focus-store'

const createRect = (left: number, top: number, right: number, bottom: number): Rect => {
  return {
    bottom,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    left,
    right,
    top,
  }
}

interface CreateFocusRectOptions {
  id?: string
  parent?: FocusRect
}

const createFocusRect = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  options: CreateFocusRectOptions = {},
): FocusRect => {
  const {id = 'test', parent} = options
  const rect = createRect(left, top, right, bottom)
  const focusRect = createStoreFocusRect(id, parent ?? null, () => rect)

  focusRect.rect = rect
  focusRect.parent = parent ?? null

  if (parent) {
    parent.children.add(focusRect)
  }

  return focusRect
}

describe('focus-controller', () => {
  it('should create a focus controller', () => {
    const focusController = createFocusController(vi.fn())

    expect(focusController.focusRootRect).toBeDefined()
    expect(focusController.moveFocus).toBeTypeOf('function')
    expect(focusController.setFocus).toBeTypeOf('function')
  })

  it('should notify focused when setting the first rect', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)
    const first = createFocusRect(0, 0, 10, 10, {id: 'first'})

    focusController.setFocus(first)

    expect(onFocusChange).toHaveBeenCalledTimes(1)
    expect(onFocusChange).toHaveBeenCalledWith(first, true)
  })

  it('should unfocus the previous rect when focus moves to another rect', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)
    const first = createFocusRect(0, 0, 10, 10, {id: 'first'})
    const second = createFocusRect(20, 0, 30, 10, {id: 'second'})

    focusController.setFocus(first)
    onFocusChange.mockClear()
    focusController.setFocus(second)

    expect(onFocusChange).toHaveBeenNthCalledWith(1, first, false)
    expect(onFocusChange).toHaveBeenNthCalledWith(2, second, true)
  })

  it('should not notify when setting focus to the same rect', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)
    const first = createFocusRect(0, 0, 10, 10, {id: 'first'})

    focusController.setFocus(first)
    onFocusChange.mockClear()
    focusController.setFocus(first)

    expect(onFocusChange).not.toHaveBeenCalled()
  })

  it('should unfocus the current rect when clearing focus', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)
    const first = createFocusRect(0, 0, 10, 10, {id: 'first'})

    focusController.setFocus(first)
    onFocusChange.mockClear()
    focusController.setFocus(null)

    expect(onFocusChange).toHaveBeenCalledTimes(1)
    expect(onFocusChange).toHaveBeenCalledWith(first, false)
  })

  it('should not notify when clearing focus while nothing is focused', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)

    focusController.setFocus(null)

    expect(onFocusChange).not.toHaveBeenCalled()
  })

  it('should return null from moveFocus when nothing is focused', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)

    const result = focusController.moveFocus('right')

    expect(result).toBeNull()
    expect(onFocusChange).not.toHaveBeenCalled()
  })

  it('should unfocus the previous rect when moveFocus changes focus', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)
    const parent = createStoreFocusRect('parent', null, () => null)
    const start = createFocusRect(0, 0, 10, 10, {id: 'start', parent})
    const next = createFocusRect(20, 0, 30, 10, {id: 'next', parent})

    focusController.setFocus(start)
    onFocusChange.mockClear()
    const result = focusController.moveFocus('right')

    expect(result).toBe(next)
    expect(onFocusChange).toHaveBeenNthCalledWith(1, start, false)
    expect(onFocusChange).toHaveBeenNthCalledWith(2, next, true)
  })

  it('should not notify when moveFocus cannot find a target', () => {
    const onFocusChange = vi.fn()
    const focusController = createFocusController(onFocusChange)
    const parent = createStoreFocusRect('parent', null, () => null)
    const only = createFocusRect(0, 0, 10, 10, {id: 'only', parent})

    focusController.setFocus(only)
    onFocusChange.mockClear()
    const result = focusController.moveFocus('right')

    expect(result).toBe(only)
    expect(onFocusChange).not.toHaveBeenCalled()
  })
})
