/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import type {CharacterHitTest} from '../../character-preview/types'
import {useWidgetInteraction} from '../use-widget-interaction'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const hover = (pointerType = 'mouse') =>
  Object.assign(new MouseEvent('pointermove', {clientX: 40, clientY: 50}), {
    pointerType,
  }) as PointerEvent

const setup = () => {
  let pendingFrame: FrameRequestCallback | null = null
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pendingFrame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    pendingFrame = null
  })
  const renderFrame = () => {
    const callback = pendingFrame
    pendingFrame = null
    callback?.(0)
  }
  const [hitTest, setHitTest] = createSignal<CharacterHitTest | null>(null)
  const [locked, setLocked] = createSignal(false)
  const [dragging, setDragging] = createSignal(false)
  const button = document.createElement('button')
  const preview = {
    dragging,
    keyboard: vi.fn(),
    move: vi.fn(),
    press: vi.fn(),
    release: vi.fn(),
  }
  const hook = renderHook(() =>
    useWidgetInteraction({button: () => button, hitTest, locked, preview: () => preview}),
  )
  const movePointer = (clientX: number, clientY: number, pointerType = 'mouse') => {
    const event = Object.assign(new MouseEvent('pointermove', {clientX, clientY}), {pointerType})
    Object.defineProperty(event, 'currentTarget', {value: button})
    hook.result.handleMove(event as PointerEvent & {currentTarget: HTMLButtonElement})
  }
  return {...hook, button, movePointer, preview, renderFrame, setDragging, setHitTest, setLocked}
}

test('should refresh an opaque pixel under the resting pointer when hit testing becomes ready', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  expect(hook.result.hovered()).toBe(false)
  hook.setHitTest(() => () => true)
  expect(hook.result.hovered()).toBe(false)
  hook.renderFrame()
  expect(hook.result.hovered()).toBe(true)
  expect(hook.result.tooltip()).toEqual({x: 52, y: 70})
  hook.setHitTest(null)
  hook.renderFrame()
  expect(hook.result.hovered()).toBe(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should keep transparent pixels unhovered after readiness changes', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  hook.setHitTest(() => () => false)
  hook.renderFrame()
  expect(hook.result.hovered()).toBe(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should wait for first-render initialization before replaying the stationary pointer', () => {
  const hook = setup()
  let initialized = false
  hook.result.handleHover(hover())
  hook.setHitTest(() => () => initialized)
  expect(hook.result.hovered()).toBe(false)
  initialized = true
  hook.renderFrame()
  expect(hook.result.hovered()).toBe(true)
})

test('should discard a hover that leaves while the ready frame is pending', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  const hitTest = vi.fn(() => true)
  hook.setHitTest(() => hitTest)
  hook.result.handleLeave()
  hook.renderFrame()
  expect(hitTest).not.toHaveBeenCalled()
  expect(hook.result.hovered()).toBe(false)
})

test('should forget a pointer that leaves before loading finishes', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  hook.result.handleLeave()
  const hitTest = vi.fn(() => true)
  hook.setHitTest(() => hitTest)
  hook.renderFrame()
  expect(hitTest).not.toHaveBeenCalled()
  expect(hook.result.hovered()).toBe(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should retain touch tooltip suppression when hit testing becomes ready', () => {
  const hook = setup()
  hook.result.handleHover(hover('touch'))
  hook.setHitTest(() => () => true)
  hook.renderFrame()
  expect(hook.result.hovered()).toBe(true)
  expect(hook.result.tooltip()).toBeNull()
})

test('should not revive a pointer after the story locks the widget', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  hook.setLocked(true)
  hook.setHitTest(() => () => true)
  hook.renderFrame()
  hook.setLocked(false)
  expect(hook.result.hovered()).toBe(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should retain the keyboard focus anchor across hit test readiness', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  vi.spyOn(hook.button, 'matches').mockReturnValue(true)
  hook.result.handleFocus({currentTarget: hook.button} as FocusEvent & {
    currentTarget: HTMLButtonElement
  })
  expect(hook.result.tooltip()).toEqual({x: 0, y: 20})
  hook.setHitTest(() => () => true)
  hook.renderFrame()
  expect(hook.result.tooltip()).toEqual({x: 0, y: 20})
})

test('should keep an Escape-dismissed hint hidden when loading finishes', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  hook.result.handleKeyDown({currentTarget: hook.button, key: 'Escape'} as KeyboardEvent & {
    currentTarget: HTMLButtonElement
  })
  hook.setHitTest(() => () => true)
  hook.renderFrame()
  expect(hook.result.tooltip()).toBeNull()
  expect(hook.preview.keyboard).toHaveBeenCalledOnce()
})

test('should not replay a hover during an active drag', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  hook.setDragging(true)
  const hitTest = vi.fn(() => true)
  hook.setHitTest(() => hitTest)
  hook.renderFrame()
  expect(hitTest).not.toHaveBeenCalled()
  expect(hook.result.tooltip()).toBeNull()
})

test('should stop readiness work when the widget is unmounted', () => {
  const hook = setup()
  hook.result.handleHover(hover())
  const hitTest = vi.fn(() => true)
  hook.setHitTest(() => hitTest)
  hook.cleanup()
  hook.renderFrame()
  expect(hitTest).not.toHaveBeenCalled()
})

test('should clear hover and the hint when a constrained drag ends over transparent pixels', () => {
  const hook = setup()
  hook.setHitTest(() => (point) => point.clientX < 100)
  hook.result.handleHover(hover())
  expect(hook.result.hovered()).toBe(true)
  hook.setDragging(true)
  hook.movePointer(200, 50)
  expect(hook.result.hovered()).toBe(true)
  expect(hook.result.tooltip()).toBeNull()
  hook.setDragging(false)
  expect(hook.result.hovered()).toBe(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should restore the hint at the final pointer position when a drag ends over the character', () => {
  const hook = setup()
  hook.setHitTest(() => () => true)
  hook.result.handleHover(hover())
  hook.setDragging(true)
  hook.movePointer(80, 60)
  hook.setDragging(false)
  expect(hook.result.hovered()).toBe(true)
  expect(hook.result.tooltip()).toEqual({x: 92, y: 80})
})

test('should keep the touch hint hidden after dragging ends', () => {
  const hook = setup()
  hook.setHitTest(() => () => true)
  hook.result.handleHover(hover('touch'))
  hook.setDragging(true)
  hook.movePointer(80, 60, 'touch')
  hook.setDragging(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should not revive an Escape-dismissed pointer when dragging ends', () => {
  const hook = setup()
  hook.setHitTest(() => () => true)
  hook.result.handleHover(hover())
  hook.setDragging(true)
  hook.movePointer(80, 60)
  hook.result.handleKeyDown({currentTarget: hook.button, key: 'Escape'} as KeyboardEvent & {
    currentTarget: HTMLButtonElement
  })
  hook.setDragging(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should leave the pointer forgotten when locking releases an active drag', () => {
  const hook = setup()
  hook.preview.release.mockImplementation(() => hook.setDragging(false))
  hook.setHitTest(() => () => true)
  hook.result.handleHover(hover())
  hook.setDragging(true)
  hook.movePointer(80, 60)
  hook.setLocked(true)
  hook.setLocked(false)
  expect(hook.result.tooltip()).toBeNull()
})

test('should not sample the last drag pointer after unmount', () => {
  const hook = setup()
  const hitTest = vi.fn(() => true)
  hook.setHitTest(() => hitTest)
  hook.result.handleHover(hover())
  hook.setDragging(true)
  hook.movePointer(80, 60)
  hitTest.mockClear()
  hook.cleanup()
  hook.setDragging(false)
  expect(hitTest).not.toHaveBeenCalled()
})
