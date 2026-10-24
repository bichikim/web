/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import type {PoffoTrackingBindings} from '@winter-love/wallpaper/settings/tracking'
import {useParameters} from '../../features/tracking/use-parameters'
import {SPoffoTrackingBindings} from '../SPoffoTrackingBindings'

vi.mock('../../features/tracking/use-parameters', () => ({useParameters: vi.fn()}))
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
})
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should show the automatic connection and persist manual selection and inversion', () => {
  vi.mocked(useParameters).mockReturnValue({
    error: () => null,
    loading: () => false,
    parameters: () => [
      {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: '얼굴 X'},
      {defaultValue: 0, id: 'custom-turn', maximum: 1, minimum: -1, name: '사용자 회전'},
    ],
  })
  const [bindings, setBindings] = createSignal<PoffoTrackingBindings>({})
  const view = render(() => (
    <SPoffoTrackingBindings
      assetId="character"
      load={vi.fn()}
      value={bindings()}
      onChange={setBindings}
    />
  ))
  const details = view.container.querySelector('details')!
  details.open = true
  fireEvent(details, new Event('toggle'))
  const head = screen.getByRole('combobox', {name: '얼굴 좌우 파라미터'})
  expect(head.textContent).toContain('자동 · 얼굴 X')
  fireEvent.click(head)
  fireEvent.click(screen.getByRole('option', {name: '사용자 회전'}))
  expect(bindings().headX).toEqual({parameterId: 'custom-turn'})
  fireEvent.click(screen.getByRole('button', {name: '얼굴 좌우 방향 반전'}))
  expect(bindings().headX).toEqual({inverted: true, parameterId: 'custom-turn'})
  fireEvent.click(head)
  fireEvent.click(screen.getByRole('option', {name: '사용 안 함'}))
  expect(bindings().headX?.parameterId).toBeNull()
})

test('should display the model-derived eye direction and allow overriding it', () => {
  vi.mocked(useParameters).mockReturnValue({
    error: () => null,
    loading: () => false,
    parameters: () => [{defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1, positiveY: 'down'}],
  })
  const [bindings, setBindings] = createSignal<PoffoTrackingBindings>({})
  const view = render(() => (
    <SPoffoTrackingBindings
      assetId="character"
      load={vi.fn()}
      value={bindings()}
      onChange={setBindings}
    />
  ))
  const details = view.container.querySelector('details')!
  details.open = true
  fireEvent(details, new Event('toggle'))
  const button = screen.getByRole('button', {name: '눈동자 상하 방향 반전'})
  expect(button).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(button)
  expect(bindings().eyeY).toEqual({inverted: false})
  expect(button).toHaveAttribute('aria-pressed', 'false')
})

test('should expose input and parameter connections without another disclosure', () => {
  vi.mocked(useParameters).mockReturnValue({
    error: () => null,
    loading: () => false,
    parameters: () => [],
  })
  const save = vi.fn()
  render(() => (
    <SPoffoTrackingBindings disclosure={false} assetId="character" load={vi.fn()} onChange={save} />
  ))
  expect(
    screen.getByRole('region', {name: '입력과 파라미터 연결'}).querySelector('details'),
  ).toBeNull()
  expect(screen.getByRole('combobox', {name: '얼굴 좌우 파라미터'})).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '눈동자 상하 방향 반전'}))
  expect(save).toHaveBeenCalledWith({eyeY: {inverted: true}})
})
