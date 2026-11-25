/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import type {PoffoTrackingBindings} from '@winter-love/wallpaper/settings/tracking'
import {useParameters} from '../../features/tracking/use-parameters'
import {SPoffoTrackingBindings} from '../SPoffoTrackingBindings'
import {interfaceLanguage, nativeLanguage} from '../../features/localization'

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

test('should translate builtin parameter choices while retaining custom names and saved IDs', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  const parameters = [
    {defaultValue: 0, id: 'TouchBagStrap', maximum: 1, minimum: 0, name: '숄더백 끈'},
    {defaultValue: 0, id: 'custom', maximum: 1, minimum: 0, name: '내가 만든 회전'},
  ]
  const change = vi.fn()
  try {
    await interfaceLanguage.change('en')
    render(() => (
      <SPoffoTrackingBindings
        source={{error: () => null, loading: () => false, parameters: () => parameters}}
        disclosure={false}
        assetId="character"
        load={vi.fn()}
        value={{headX: {parameterId: 'TouchBagStrap'}}}
        onChange={change}
      />
    ))
    const field = screen.getByRole('combobox', {name: 'Head horizontal parameter'})
    expect(field).toHaveTextContent('Shoulder bag strap')
    fireEvent.click(field)
    expect(screen.getByRole('option', {name: 'Shoulder bag strap'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', {name: '내가 만든 회전'}))
    expect(change).toHaveBeenCalledExactlyOnceWith({headX: {parameterId: 'custom'}})
    expect(parameters[0]?.name).toBe('숄더백 끈')
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
  }
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
  const head = screen.getByRole('combobox', {name: '머리 좌우 파라미터'})
  expect(head.textContent).toContain('자동 · 얼굴 X')
  fireEvent.click(head)
  fireEvent.click(screen.getByRole('option', {name: '사용자 회전'}))
  expect(bindings().headX).toEqual({parameterId: 'custom-turn'})
  fireEvent.click(screen.getByRole('button', {name: '머리 좌우 방향 반전'}))
  expect(bindings().headX).toEqual({inverted: true, parameterId: 'custom-turn'})
  const blend = screen.getByRole('combobox', {name: '머리 좌우 적용 방식'})
  expect(blend.textContent).toContain('덮어쓰기')
  fireEvent.click(blend)
  fireEvent.click(screen.getByRole('option', {name: '더하기'}))
  expect(bindings().headX).toEqual({blend: 'add', inverted: true, parameterId: 'custom-turn'})
  fireEvent.click(head)
  fireEvent.click(screen.getByRole('option', {name: '사용 안 함'}))
  expect(bindings().headX?.parameterId).toBeNull()
  expect(bindings().headX?.blend).toBe('add')
  fireEvent.click(screen.getByRole('combobox', {name: '몸 좌우 파라미터'}))
  fireEvent.click(screen.getByRole('option', {name: '사용자 회전'}))
  fireEvent.click(screen.getByRole('combobox', {name: '몸 좌우 적용 방식'}))
  fireEvent.click(screen.getByRole('option', {name: '더하기'}))
  expect(bindings().bodyX).toEqual({blend: 'add', parameterId: 'custom-turn'})
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
  expect(screen.getByRole('combobox', {name: '머리 좌우 파라미터'})).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '눈동자 상하 방향 반전'}))
  expect(save).toHaveBeenCalledWith({eyeY: {inverted: true}})
})
