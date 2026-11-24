/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import type {AgentState, AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import {SPoffoAgentStateSettings} from '../SPoffoAgentStateSettings'
import {SemanticContext, type SemanticRuntime} from '../../features/semantics/context'
import {interfaceLanguage, nativeLanguage} from '../../features/localization'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)
const selectState = (name: string) => {
  fireEvent.click(screen.getByRole('combobox', {name: '작업 상태 연결 선택'}))
  fireEvent.click(screen.getByRole('option', {name}))
}

it('should translate builtin parameter descriptions and choices while retaining custom names', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  const change = vi.fn()
  try {
    await interfaceLanguage.change('en')
    render(() => (
      <SPoffoAgentStateSettings
        value={{working: {parameterId: 'TouchBagStrap'}}}
        onChange={change}
        parameters={[
          {defaultValue: 0, id: 'TouchBagStrap', maximum: 1, minimum: 0, name: '숄더백 끈'},
          {defaultValue: 0, id: 'custom', maximum: 1, minimum: 0, name: '나의 상태'},
        ]}
      />
    ))
    const working = screen.getByRole('button', {name: 'Edit Working'})
    expect(working).toHaveTextContent('Shoulder bag strap')
    fireEvent.click(working)
    const field = screen.getByRole('combobox', {name: 'Working state parameter'})
    expect(field).toHaveTextContent('Shoulder bag strap')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('option', {name: '나의 상태'}))
    expect(change).toHaveBeenCalledWith({working: {actions: undefined, parameterId: 'custom'}})
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
  }
})
it('should show one selected state editor and preserve other state bindings when switching', () => {
  const [value, setValue] = createSignal<AgentStateBindings>({
    question: {parameterId: 'wait'},
    working: {on: 0.7, parameterId: 'wait'},
  })
  render(() => (
    <SPoffoAgentStateSettings
      value={value()}
      onChange={setValue}
      parameters={[{defaultValue: 0, id: 'wait', maximum: 1, minimum: 0}]}
    />
  ))
  expect(screen.queryByRole('group', {name: / 상태 연결$/})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '작업 중 편집'}))
  const on = screen.getByRole('spinbutton', {name: '작업 중 ON 값'})
  fireEvent.input(on, {target: {value: '0.8'}})
  fireEvent.blur(on)
  selectState('질문')
  expect(screen.queryByRole('group', {name: '작업 중 상태 연결'})).toBeNull()
  expect(value()).toEqual({
    question: {parameterId: 'wait'},
    working: {on: 0.8, parameterId: 'wait'},
  })
})
it('should manually execute action and parameter states without saving configuration and stop on unmount', () => {
  const [selected, setSelected] = createSignal<AgentState | null>(null)
  const previewAgent = vi.fn((_widgetId: string, state: AgentState | null) => setSelected(state))
  const runtime: SemanticRuntime = {
    busy: () => false,
    error: () => null,
    preview: vi.fn(),
    previewAgent,
    previewing: () => false,
    previewingAgent: (_widgetId, state) => selected() === state,
    score: () => undefined,
    test: vi.fn(),
  }
  const save = vi.fn()
  const view = render(() => (
    <SemanticContext.Provider value={runtime}>
      <SPoffoAgentStateSettings
        widgetId="widget"
        onChange={save}
        value={{
          question: {on: 0.7, parameterId: 'wait'},
          working: {actions: [{id: 'notes', kind: 'expression'}], parameterId: null},
        }}
        actions={[{action: {id: 'notes', kind: 'expression'}, label: '노트'}]}
        parameters={[{defaultValue: 0, id: 'wait', maximum: 1, minimum: 0}]}
      />
    </SemanticContext.Provider>
  ))
  fireEvent.click(screen.getByRole('button', {name: '연결됨 편집'}))
  expect(screen.getByRole('button', {name: '연결됨 수동 실행'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '작업 상태 연결 목록으로'}))
  fireEvent.click(screen.getByRole('button', {name: '작업 중 편집'}))
  const working = screen.getByRole('button', {name: '작업 중 수동 실행'})
  fireEvent.click(working)
  expect(working).toHaveAttribute('aria-pressed', 'true')
  expect(previewAgent).toHaveBeenLastCalledWith('widget', 'working')
  selectState('질문')
  expect(previewAgent).toHaveBeenLastCalledWith('widget', null)
  fireEvent.click(screen.getByRole('button', {name: '질문 수동 실행'}))
  expect(previewAgent).toHaveBeenLastCalledWith('widget', 'question')
  fireEvent.click(screen.getByRole('button', {name: '질문 수동 실행 중지'}))
  expect(previewAgent).toHaveBeenLastCalledWith('widget', null)
  expect(screen.getByRole('button', {name: '질문 수동 실행'})).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  selectState('작업 중')
  fireEvent.click(screen.getByRole('button', {name: '작업 중 수동 실행'}))
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: '작업 상태 연결 목록으로'}))
  expect(previewAgent).toHaveBeenLastCalledWith('widget', null)
  fireEvent.click(screen.getByRole('button', {name: '작업 중 편집'}))
  fireEvent.click(screen.getByRole('button', {name: '작업 중 수동 실행'}))
  view.unmount()
  expect(previewAgent).toHaveBeenLastCalledWith('widget', null)
})

it('should replace a legacy state parameter with a behavior bundle without changing other states', async () => {
  const [value, setValue] = createSignal<AgentStateBindings>({
    question: {parameterId: 'wait'},
    working: {on: 0.7, parameterId: 'wait'},
  })
  render(() => (
    <SPoffoAgentStateSettings
      value={value()}
      onChange={setValue}
      actions={['노트 들기', '필기 동작'].map((id) => ({
        action: {id, kind: 'expression'},
        label: id,
      }))}
      parameters={[{defaultValue: 0, id: 'wait', maximum: 1, minimum: 0}]}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '작업 중 편집'}))
  fireEvent.click(screen.getByRole('combobox', {name: '작업 중 상태 행동'}))
  fireEvent.click(screen.getByRole('option', {name: '노트 들기'}))
  await Promise.resolve()
  fireEvent.click(screen.getByRole('button', {name: '작업 중 상태 행동 추가'}))
  fireEvent.click(screen.getByRole('combobox', {name: '작업 중 상태 행동 2'}))
  fireEvent.click(screen.getByRole('option', {name: '필기 동작'}))
  expect(value().working).toMatchObject({
    actions: [
      {id: '노트 들기', kind: 'expression'},
      {id: '필기 동작', kind: 'expression'},
    ],
    parameterId: null,
  })
  expect(value().working?.on).toBeUndefined()
  expect(value().question).toEqual({parameterId: 'wait'})
})
it('should configure a state target and independent on/off values without removing other connections', () => {
  const [value, setValue] = createSignal<AgentStateBindings>({question: {parameterId: 'wait'}})
  render(() => (
    <SPoffoAgentStateSettings
      value={value()}
      onChange={setValue}
      parameters={[{defaultValue: 0, id: 'wait', maximum: 1, minimum: -1, name: '대기'}]}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '작업 중 편집'}))
  fireEvent.click(screen.getByRole('combobox', {name: '작업 중 상태 파라미터'}))
  fireEvent.click(screen.getByRole('option', {name: '대기'}))
  expect(value().working).toEqual({parameterId: 'wait'})
  const on = screen.getByRole('spinbutton', {name: '작업 중 ON 값'})
  fireEvent.input(on, {target: {value: '0.7'}})
  fireEvent.blur(on)
  expect(value().working?.on).toBe(0.7)
  expect(value().question?.parameterId).toBe('wait')
  fireEvent.click(screen.getByRole('combobox', {name: '작업 중 상태 파라미터'}))
  fireEvent.click(screen.getByRole('option', {name: '연결 안 함'}))
  expect(value().working?.parameterId).toBeNull()
  expect(screen.queryByRole('spinbutton', {name: '작업 중 ON 값'})).not.toBeInTheDocument()
})
