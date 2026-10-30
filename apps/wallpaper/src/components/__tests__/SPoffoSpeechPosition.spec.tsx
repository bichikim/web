/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {SPoffoSpeechPosition} from '../SPoffoSpeechPosition'

afterEach(cleanup)

const pointer = (type: string, x: number, y: number) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y})
  Object.defineProperty(event, 'pointerId', {value: 1})
  return event
}

const renderPosition = () => {
  const save = vi.fn()
  const [target, setTarget] = createSignal('first')
  render(() => (
    <SPoffoSpeechPosition
      targetId={target()}
      value={{enabled: false, x: 0.9, y: 0.05}}
      onChange={save}
    />
  ))
  const handle = screen.getByRole('button', {name: '말풍선 위치 조정'})
  const area = screen.getByRole('group', {name: '말풍선 위치'})
  vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({height: 100, width: 200} as DOMRect)
  Object.defineProperty(handle, 'hasPointerCapture', {value: vi.fn(() => true)})
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(handle, 'releasePointerCapture', {value: vi.fn()})
  return {handle, save, setTarget}
}

it('should commit preview movement relative to the character frame only on release', () => {
  const {handle, save} = renderPosition()
  fireEvent(handle, pointer('pointerdown', 100, 50))
  fireEvent(handle, pointer('pointermove', 80, 70))
  expect(handle.style.getPropertyValue('--speech-x')).toBe('80%')
  expect(handle.style.getPropertyValue('--speech-y')).toBe('25%')
  expect(save).not.toHaveBeenCalled()
  fireEvent(handle, pointer('pointerup', 80, 70))
  expect(save).toHaveBeenCalledExactlyOnceWith({enabled: false, x: 0.8, y: 0.25})
})

it('should cancel an unfinished movement when another widget is selected', () => {
  const {handle, save, setTarget} = renderPosition()
  fireEvent(handle, pointer('pointerdown', 100, 50))
  fireEvent(handle, pointer('pointermove', 120, 50))
  setTarget('second')
  fireEvent(handle, pointer('pointerup', 120, 50))
  expect(save).not.toHaveBeenCalled()
  expect(handle.style.getPropertyValue('--speech-x')).toBe('90%')
})

it('should cancel with Escape and support keyboard positioning while speech is hidden', () => {
  const {handle, save} = renderPosition()
  fireEvent(handle, pointer('pointerdown', 100, 50))
  fireEvent(handle, pointer('pointermove', 120, 50))
  fireEvent.keyDown(handle, {key: 'Escape'})
  fireEvent(handle, pointer('pointerup', 120, 50))
  expect(save).not.toHaveBeenCalled()
  fireEvent.keyDown(handle, {key: 'ArrowLeft'})
  expect(save).toHaveBeenCalledExactlyOnceWith({enabled: false, x: 0.85, y: 0.05})
})
