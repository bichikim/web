/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoSemanticSettings} from '../SPoffoSemanticSettings'
import {SemanticContext} from '../../features/semantics/context'

afterEach(cleanup)
const mount = () => {
  const [bindings, setBindings] = createSignal<readonly SemanticBinding[]>([])
  render(() => (
    <SPoffoSemanticSettings
      value={bindings()}
      onChange={setBindings}
      actions={[{action: {id: '노트 들기', kind: 'expression'}, label: '노트 들기'}]}
    />
  ))
  return bindings
}
it('should register a description and preserve its input node while editing', () => {
  const bindings = mount()
  fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
  expect(screen.getByRole('button', {name: '연결 1 수동 실행'})).toBeDisabled()
  const input = screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})
  fireEvent.input(input, {target: {value: '기쁘고 신나는 내용'}})
  expect(bindings()[0].text).toBe('기쁘고 신나는 내용')
  expect(screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})).toBe(input)
  const exclusions = screen.getByRole('textbox', {hidden: true, name: '연결 1 제외 예문'})
  fireEvent.input(exclusions, {target: {value: '울지 않았어요.'}})
  expect(bindings()[0].excludeText).toBe('울지 않았어요.')
  fireEvent.input(exclusions, {target: {value: ''}})
  expect(bindings()[0].excludeText).toBeUndefined()
  fireEvent.click(screen.getByRole('switch', {name: '연결 1 사용'}))
  expect(bindings()[0].enabled).toBe(false)
  fireEvent.click(screen.getByRole('button', {name: '연결 1 삭제'}))
  expect(bindings()).toEqual([])
})
it('should trigger each connection independently and stop previews when settings close', () => {
  const [active, setActive] = createSignal<string | null>(null)
  const preview = vi.fn((_widgetId: string, id: string | null) => {
    setActive(id)
  })
  const view = render(() => (
    <SemanticContext.Provider
      value={{
        busy: () => false,
        error: () => null,
        preview,
        previewing: (_widgetId, id) => active() === id,
        score: () => undefined,
        test: vi.fn(),
      }}
    >
      <SPoffoSemanticSettings
        widgetId="manual-widget"
        actions={[{action: {id: '노트 들기', kind: 'expression'}, label: '노트 들기'}]}
        value={['first', 'second', 'missing'].map((id) => ({
          action: id === 'missing' ? undefined : {id: '노트 들기', kind: 'expression'},
          enabled: true,
          id,
          mode: 'toggle',
          parameterId: null,
          text: '',
          threshold: 0.75,
        }))}
      />
    </SemanticContext.Provider>
  ))
  expect(screen.getByRole('button', {name: '연결 3 수동 실행'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '연결 1 수동 실행'}))
  expect(preview).toHaveBeenLastCalledWith('manual-widget', 'first')
  expect(screen.getByRole('button', {name: '연결 1 수동 실행 중지'})).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  fireEvent.click(screen.getByRole('button', {name: '연결 2 수동 실행'}))
  expect(preview).toHaveBeenLastCalledWith('manual-widget', 'second')
  expect(screen.getByRole('button', {name: '연결 1 수동 실행'})).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  fireEvent.click(screen.getByRole('button', {name: '연결 2 수동 실행 중지'}))
  expect(preview).toHaveBeenLastCalledWith('manual-widget', null)
  fireEvent.click(screen.getByRole('button', {name: '연결 1 수동 실행'}))
  view.unmount()
  expect(preview).toHaveBeenLastCalledWith('manual-widget', null)
})
it('should connect a character action and adjust matching without exposing individual parameters', () => {
  const bindings = mount()
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  try {
    fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 행동'}))
    fireEvent.click(screen.getByRole('option', {name: '노트 들기'}))
    expect(bindings()[0]).toMatchObject({
      action: {id: '노트 들기', kind: 'expression'},
      parameterId: null,
    })
    expect(screen.queryByRole('combobox', {name: '연결 1 파라미터'})).toBeNull()
    const threshold = screen.getByRole('spinbutton', {name: '연결 1 매칭 기준'})
    fireEvent.input(threshold, {target: {value: '0.85'}})
    fireEvent.blur(threshold)
    expect(bindings()[0].threshold).toBe(0.85)
  } finally {
    if (original === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
    }
  }
})
