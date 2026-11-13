/** @vitest-environment jsdom */
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {ViewCameraControls} from '../ViewCameraControls'
import {EditorSelect} from '../../../design-system'

test('should dismiss with Escape and return focus to the trigger', () => {
  const view = render(() => (
    <ViewCameraControls camera={{x: 0, y: 0, zoom: 1}} onChange={vi.fn()} onFit={vi.fn()} />
  ))
  const trigger = view.getByRole('button', {name: '보기 설정'})
  fireEvent.click(trigger)
  const input = view.getByRole('spinbutton', {name: '보기 X'})
  input.focus()
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(view.queryByRole('dialog', {name: '보기 설정'})).toBeNull()
  expect(trigger).toHaveFocus()
})

test('should group camera and host settings and keep nested selections inside the settings surface', () => {
  const select = vi.fn()
  const view = render(() => (
    <ViewCameraControls
      camera={{x: 0, y: 0, zoom: 1}}
      onChange={vi.fn()}
      onFit={vi.fn()}
      settings={
        <fieldset>
          <legend>렌더링</legend>
          <EditorSelect label="렌더러" options={['자동', 'WebGL']} value="자동" onChange={select} />
        </fieldset>
      }
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '보기 설정'}))
  const settings = view.getByRole('dialog', {name: '보기 설정'})
  expect(within(settings).getByRole('group', {name: '화면'})).toBeInTheDocument()
  fireEvent.keyDown(within(settings).getByRole('button', {name: /렌더러/}), {key: 'ArrowDown'})
  const option = screen.getByRole('option', {name: 'WebGL'})
  fireEvent.pointerDown(option)
  fireEvent.click(option)
  expect(select).toHaveBeenCalledWith('WebGL')
  expect(view.getByRole('dialog', {name: '보기 설정'})).toBeInTheDocument()
})

test('should match the popup role and close when the browser hides its native surface', () => {
  const view = render(() => (
    <ViewCameraControls camera={{x: 0, y: 0, zoom: 1}} onChange={vi.fn()} onFit={vi.fn()} />
  ))
  const trigger = view.getByRole('button', {name: '보기 설정'})
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  const panel = view.getByRole('dialog', {name: '보기 설정'})
  fireEvent(panel, Object.assign(new Event('toggle'), {newState: 'closed'}))
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(view.queryByRole('dialog', {name: '보기 설정'})).toBeNull()
  fireEvent.click(trigger)
  fireEvent(panel, Object.assign(new Event('toggle'), {newState: 'closed'}))
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
})
