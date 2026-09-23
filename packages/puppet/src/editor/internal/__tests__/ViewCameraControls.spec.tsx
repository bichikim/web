/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {ViewCameraControls} from '../ViewCameraControls'

test('should keep settings open inside and dismiss on outside pointer down even when bubbling is stopped', () => {
  const view = render(() => (
    <>
      <ViewCameraControls camera={{x: 0, y: 0, zoom: 1}} onChange={vi.fn()} onFit={vi.fn()} />
      <button onPointerDown={(event) => event.stopPropagation()}>바깥</button>
    </>
  ))
  const trigger = view.getByRole('button', {name: '보기 설정'})
  fireEvent.click(trigger)
  fireEvent.pointerDown(view.getByRole('spinbutton', {name: '보기 X'}))
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  fireEvent.pointerDown(view.getByRole('button', {name: '바깥'}))
  expect(view.queryByRole('group', {name: '보기 설정'})).toBeNull()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  fireEvent.pointerDown(trigger)
  fireEvent.click(trigger)
  expect(view.queryByRole('group', {name: '보기 설정'})).toBeNull()
})

test('should dismiss with Escape and return focus to the trigger', () => {
  const view = render(() => (
    <ViewCameraControls camera={{x: 0, y: 0, zoom: 1}} onChange={vi.fn()} onFit={vi.fn()} />
  ))
  const trigger = view.getByRole('button', {name: '보기 설정'})
  fireEvent.click(trigger)
  const input = view.getByRole('spinbutton', {name: '보기 X'})
  input.focus()
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(view.queryByRole('group', {name: '보기 설정'})).toBeNull()
  expect(trigger).toHaveFocus()
})
