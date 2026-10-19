/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {SSlider} from '../SSlider'

afterEach(cleanup)
const pointer = (type: string, x: number) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: 10})
  Object.defineProperty(event, 'pointerId', {value: 1})
  return event
}
test('should preview a slider drag and commit once on release', () => {
  const save = vi.fn()
  const preview = vi.fn()
  render(() => (
    <SSlider
      label="좌우 반응"
      value={1}
      min={0}
      max={5}
      step={0.1}
      onChange={save}
      onPreview={preview}
    />
  ))
  const slider = screen.getByRole('slider', {name: '좌우 반응'})
  vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
    height: 20,
    left: 0,
    top: 0,
    width: 200,
  } as DOMRect)
  Object.defineProperty(slider, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(slider, 'releasePointerCapture', {value: vi.fn()})
  fireEvent(slider, pointer('pointerdown', 100))
  fireEvent(slider, pointer('pointermove', 160))
  expect(preview).toHaveBeenLastCalledWith(4)
  expect(slider).toHaveAttribute('aria-valuenow', '4')
  expect(save).not.toHaveBeenCalled()
  fireEvent(slider, pointer('pointerup', 160))
  expect(save).toHaveBeenCalledExactlyOnceWith(4)
  expect(preview).toHaveBeenLastCalledWith(null)
})
test('should support keyboard bounds and steps and block changes while disabled', () => {
  const save = vi.fn()
  render(() => <SSlider label="상하 반응" value={1} min={0} max={5} step={0.1} onChange={save} />)
  const slider = screen.getByRole('slider', {name: '상하 반응'})
  fireEvent.keyDown(slider, {key: 'ArrowUp'})
  expect(save).toHaveBeenLastCalledWith(1.1)
  fireEvent.keyDown(slider, {key: 'Home'})
  expect(save).toHaveBeenLastCalledWith(0)
  fireEvent.keyDown(slider, {key: 'End'})
  expect(save).toHaveBeenLastCalledWith(5)
  cleanup()
  render(() => <SSlider label="상하 반응" value={1} min={0} max={5} disabled onChange={save} />)
  save.mockClear()
  fireEvent.keyDown(screen.getByRole('slider'), {key: 'ArrowRight'})
  expect(save).not.toHaveBeenCalled()
})
test('should cancel a drag with Escape without persisting it', () => {
  const save = vi.fn()
  const preview = vi.fn()
  render(() => (
    <SSlider label="반응" value={1} min={0} max={5} onChange={save} onPreview={preview} />
  ))
  const slider = screen.getByRole('slider')
  vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
    height: 20,
    left: 0,
    top: 0,
    width: 200,
  } as DOMRect)
  Object.defineProperty(slider, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(slider, 'releasePointerCapture', {value: vi.fn()})
  fireEvent(slider, pointer('pointerdown', 160))
  fireEvent.keyDown(slider, {key: 'Escape'})
  fireEvent(slider, pointer('pointerup', 160))
  expect(save).not.toHaveBeenCalled()
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(slider).toHaveAttribute('aria-valuenow', '1')
})
