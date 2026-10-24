/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {SPoffoMotionPad} from '../SPoffoMotionPad'

afterEach(cleanup)
const pointer = (type: string, x: number, y: number) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y})
  Object.defineProperty(event, 'pointerId', {value: 1})
  return event
}
const prepare = (label: string) => {
  const pad = screen.getByRole('group', {name: label})
  const area = pad.querySelector('[tabindex="-1"]') as HTMLDivElement
  vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({
    height: 200,
    left: 0,
    top: 0,
    width: 200,
  } as DOMRect)
  Object.defineProperty(area, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(area, 'releasePointerCapture', {value: vi.fn()})
  return area
}
test('should seek and drag with upward positive Y and commit only on release', () => {
  const save = vi.fn()
  const preview = vi.fn()
  render(() => (
    <SPoffoMotionPad
      label="얼굴 기본 방향"
      fields={['headCenterX', 'headCenterY']}
      value={{eyeCenterY: 25}}
      step={1}
      onChange={save}
      onPreview={preview}
    />
  ))
  const area = prepare('얼굴 기본 방향')
  fireEvent(area, pointer('pointerdown', 150, 50))
  expect(preview).toHaveBeenLastCalledWith({eyeCenterY: 25, headCenterX: 50, headCenterY: 50})
  fireEvent(area, pointer('pointermove', 180, 20))
  expect(preview).toHaveBeenLastCalledWith({eyeCenterY: 25, headCenterX: 80, headCenterY: 80})
  expect(save).not.toHaveBeenCalled()
  fireEvent(area, pointer('pointerup', 180, 20))
  expect(save).toHaveBeenCalledExactlyOnceWith({eyeCenterY: 25, headCenterX: 80, headCenterY: 80})
})
test('should cancel a drag with Escape and support precise keyboard steps', () => {
  const save = vi.fn()
  const preview = vi.fn()
  render(() => (
    <SPoffoMotionPad
      label="눈동자 기본 방향"
      fields={['eyeCenterX', 'eyeCenterY']}
      step={0.05}
      onChange={save}
      onPreview={preview}
    />
  ))
  const area = prepare('눈동자 기본 방향')
  fireEvent(area, pointer('pointerdown', 170, 30))
  fireEvent.keyDown(area, {key: 'Escape'})
  fireEvent(area, pointer('pointerup', 170, 30))
  expect(save).not.toHaveBeenCalled()
  expect(preview).toHaveBeenLastCalledWith(null)
  fireEvent.keyDown(screen.getByRole('button', {name: '눈동자 기본 방향 조정'}), {key: 'ArrowUp'})
  expect(save).toHaveBeenCalledExactlyOnceWith({eyeCenterX: 0, eyeCenterY: 0.05})
})
