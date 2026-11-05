/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {SRangePad} from '../SRangePad'

afterEach(cleanup)
const pointer = (type: string, x: number, y: number) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y})
  Object.defineProperty(event, 'pointerId', {value: 1})
  return event
}
const prepare = (handle: HTMLButtonElement) => {
  const area = screen.getByRole('group', {name: '움직임 범위'})
  vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({height: 200, width: 200} as DOMRect)
  Object.defineProperty(handle, 'hasPointerCapture', {value: vi.fn(() => true)})
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(handle, 'releasePointerCapture', {value: vi.fn()})
}
test('should resize either corner independently and preview without saving until release', () => {
  const save = vi.fn()
  const preview = vi.fn()
  render(() => (
    <SRangePad
      label="움직임 범위"
      limit={100}
      value={{maxX: 40, maxY: 30, minX: -20, minY: -10}}
      onChange={save}
      onPreview={preview}
    />
  ))
  const handle = screen.getByRole('button', {name: '움직임 범위 왼쪽 아래'}) as HTMLButtonElement
  prepare(handle)
  fireEvent(handle, pointer('pointerdown', 80, 110))
  fireEvent(handle, pointer('pointermove', 60, 140))
  expect(preview).toHaveBeenLastCalledWith({maxX: 40, maxY: 30, minX: -40, minY: -40})
  expect(save).not.toHaveBeenCalled()
  fireEvent(handle, pointer('pointerup', 60, 140))
  expect(save).toHaveBeenCalledExactlyOnceWith({maxX: 40, maxY: 30, minX: -40, minY: -40})
})
test('should move an asymmetric range across zero without changing its size and cancel on Escape', () => {
  const [value, setValue] = createSignal({maxX: 40, maxY: 30, minX: -20, minY: -10})
  const preview = vi.fn()
  render(() => (
    <SRangePad
      label="움직임 범위"
      limit={100}
      value={value()}
      onChange={setValue}
      onPreview={preview}
    />
  ))
  const body = screen.getByRole('button', {name: '움직임 범위 이동'}) as HTMLButtonElement
  prepare(body)
  fireEvent(body, pointer('pointerdown', 100, 100))
  fireEvent(body, pointer('pointermove', 150, 120))
  expect(preview).toHaveBeenLastCalledWith({maxX: 90, maxY: 10, minX: 30, minY: -30})
  fireEvent.keyDown(body, {key: 'Escape'})
  fireEvent(body, pointer('pointerup', 150, 120))
  expect(value()).toEqual({maxX: 40, maxY: 30, minX: -20, minY: -10})
  fireEvent.keyDown(body, {key: 'ArrowRight'})
  expect(value()).toEqual({maxX: 41, maxY: 30, minX: -19, minY: -10})
})

test('should stop a corner at its opposite edge and retain fractional keyboard adjustments', () => {
  const [value, setValue] = createSignal({maxX: 0.8, maxY: 0.4, minX: -0.1, minY: -0.2})
  render(() => (
    <SRangePad label="움직임 범위" limit={1} step={0.05} value={value()} onChange={setValue} />
  ))
  const handle = screen.getByRole('button', {name: '움직임 범위 오른쪽 위'}) as HTMLButtonElement
  prepare(handle)
  fireEvent(handle, pointer('pointerdown', 180, 60))
  fireEvent(handle, pointer('pointermove', 0, 200))
  fireEvent(handle, pointer('pointerup', 0, 200))
  expect(value()).toEqual({maxX: -0.1, maxY: -0.2, minX: -0.1, minY: -0.2})
  fireEvent.keyDown(handle, {key: 'ArrowRight'})
  fireEvent.keyDown(handle, {key: 'ArrowUp'})
  expect(value()).toEqual({maxX: -0.05, maxY: -0.15, minX: -0.1, minY: -0.2})
})
