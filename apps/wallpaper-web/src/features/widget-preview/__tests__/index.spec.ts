/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {useWidgetPreview} from '..'

afterEach(() => vi.restoreAllMocks())

test('should select a preset independently of walking and clear it with none', () => {
  const hook = renderHook(useWidgetPreview)
  expect(hook.result.expressionId()).toBeNull()
  hook.result.selectExpression('고양이 손')
  expect(hook.result.expressionId()).toBe('고양이 손')
  hook.result.toggleWalking()
  expect(hook.result.expressionId()).toBe('고양이 손')
  hook.result.selectExpression(null)
  expect(hook.result.expressionId()).toBeNull()
  expect(hook.result.walking()).toBe(true)
  hook.cleanup()
})

const pointer = (button: HTMLButtonElement, x: number, y: number) =>
  ({
    button: 0,
    clientX: x,
    clientY: y,
    currentTarget: button,
    pointerId: 1,
  }) as PointerEvent & {currentTarget: HTMLButtonElement}

const createWidget = () => {
  const host = document.createElement('div')
  const button = document.createElement('button')
  host.append(button)
  Object.defineProperties(host, {
    clientHeight: {configurable: true, value: 667},
    clientWidth: {configurable: true, value: 375},
  })
  button.setPointerCapture = vi.fn()
  const bounds = vi
    .spyOn(button, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 378, 472.5))
  return {bounds, button, host}
}

test('should move horizontally on a phone even when the character is wider than the screen', () => {
  const widget = createWidget()
  const hook = renderHook(useWidgetPreview)
  hook.result.press(pointer(widget.button, 180, 330))
  hook.result.move(pointer(widget.button, 300, 410))
  expect(hook.result.position()).toEqual({x: 120, y: 80})
  widget.bounds.mockReturnValue(new DOMRect(0, 0, 945, 1181.25))
  hook.result.fitPosition(widget.button)
  expect(hook.result.position()).toEqual({x: 120, y: 80})
  hook.result.release()
  expect(hook.result.dragging()).toBe(false)
  hook.cleanup()
})

test('should keep the character center reachable at both screen edges', () => {
  const {button} = createWidget()
  const hook = renderHook(useWidgetPreview)
  hook.result.press(pointer(button, 180, 330))
  hook.result.move(pointer(button, 10000, 10000))
  expect(hook.result.position()).toEqual({x: 163.5, y: 309.5})
  hook.result.move(pointer(button, -10000, -10000))
  expect(hook.result.position()).toEqual({x: -163.5, y: -309.5})
  hook.cleanup()
})

test('should refit after a phone resize and still reset to the center', () => {
  const {button, host} = createWidget()
  const hook = renderHook(useWidgetPreview)
  hook.result.press(pointer(button, 180, 330))
  hook.result.move(pointer(button, 340, 410))
  hook.result.release()
  Object.defineProperty(host, 'clientWidth', {value: 300})
  hook.result.fitPosition(button)
  expect(hook.result.position()).toEqual({x: 126, y: 80})
  hook.result.resetPosition()
  expect(hook.result.position()).toEqual({x: 0, y: 0})
  hook.cleanup()
})
