/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoSemanticSettings} from '../SPoffoSemanticSettings'

afterEach(cleanup)
const mount = () => {
  const [bindings, setBindings] = createSignal<readonly SemanticBinding[]>([])
  render(() => (
    <SPoffoSemanticSettings
      value={bindings()}
      onChange={setBindings}
      parameters={[{defaultValue: 0, id: 'head', maximum: 30, minimum: -30, name: '고개'}]}
    />
  ))
  return bindings
}
it('should register a description and preserve its input node while editing', () => {
  const bindings = mount()
  fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
  const input = screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})
  fireEvent.input(input, {target: {value: '기쁘고 신나는 내용'}})
  expect(bindings()[0].text).toBe('기쁘고 신나는 내용')
  expect(screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})).toBe(input)
  fireEvent.input(screen.getByRole('textbox', {name: '연결 1 선택 그룹'}), {
    target: {value: '손 포즈'},
  })
  expect(bindings()[0].exclusiveGroup).toBe('손 포즈')
  fireEvent.input(screen.getByRole('textbox', {name: '연결 1 선택 그룹'}), {target: {value: ''}})
  expect(bindings()[0].exclusiveGroup).toBeUndefined()
  fireEvent.click(screen.getByRole('switch', {name: '연결 1 사용'}))
  expect(bindings()[0].enabled).toBe(false)
  fireEvent.click(screen.getByRole('button', {name: '연결 1 삭제'}))
  expect(bindings()).toEqual([])
})
it('should connect a model parameter and configure its full continuous range independently of matching', () => {
  const bindings = mount()
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  try {
    fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 파라미터'}))
    fireEvent.click(screen.getByRole('option', {name: '고개'}))
    expect(bindings()[0]).toMatchObject({from: 0, parameterId: 'head', to: 30})
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 연결 방식'}))
    fireEvent.click(screen.getByRole('option', {name: '연속값'}))
    expect(bindings()[0]).toMatchObject({from: -30, mode: 'range', threshold: 0.75, to: 30})
    const value = screen.getByRole('spinbutton', {name: '연결 1 시작값'})
    fireEvent.input(value, {target: {value: '-20'}})
    fireEvent.blur(value)
    expect(bindings()[0].from).toBe(-20)
    expect(bindings()[0].threshold).toBe(0.75)
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 연결 방식'}))
    fireEvent.click(screen.getByRole('option', {name: '매칭 중 적용'}))
    expect(bindings()[0]).toMatchObject({mode: 'toggle', releaseWhenUnmatched: true})
    expect(screen.queryByRole('spinbutton', {name: '연결 1 시작값'})).toBeNull()
    expect(screen.getByText('기본 동작')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 연결 방식'}))
    fireEvent.click(screen.getByRole('option', {name: '토글'}))
    expect(bindings()[0].releaseWhenUnmatched).toBe(false)
    expect(screen.getByRole('spinbutton', {name: '연결 1 시작값'})).toBeInTheDocument()
  } finally {
    if (original === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
    }
  }
})
