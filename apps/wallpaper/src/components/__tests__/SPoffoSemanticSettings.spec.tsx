/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoSemanticSettings} from '../SPoffoSemanticSettings'
import {SemanticContext} from '../../features/semantics/context'

afterEach(cleanup)
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})
it('should select an added connection and keep only its detail editor open after removal', async () => {
  const bindings = mount()
  fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
  await Promise.resolve()
  const first = screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})
  fireEvent.input(first, {target: {value: '기쁜 내용'}})
  fireEvent.click(screen.getByRole('button', {name: '행동 연결 목록으로'}))
  fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
  await Promise.resolve()
  expect(screen.queryByRole('textbox', {name: '연결 1 감정·행동·내용'})).toBeNull()
  expect(screen.getByRole('textbox', {name: '연결 2 감정·행동·내용'})).toHaveValue('')
  fireEvent.click(screen.getByRole('button', {name: '연결 2 삭제'}))
  await Promise.resolve()
  expect(bindings()).toHaveLength(1)
  expect(screen.queryByRole('textbox', {name: '연결 1 감정·행동·내용'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '기쁜 내용 편집'}))
  expect(screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})).toHaveValue('기쁜 내용')
})
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
it('should register a description and preserve its input node while editing', async () => {
  const bindings = mount()
  fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
  await Promise.resolve()
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
  fireEvent.click(screen.getByRole('button', {name: '연결 3 편집'}))
  expect(screen.getByRole('button', {name: '연결 3 수동 실행'})).toBeDisabled()
  const selectConnection = (index: number) => {
    fireEvent.click(screen.getByRole('combobox', {name: '행동 연결 선택'}))
    fireEvent.click(screen.getAllByRole('option')[index]!)
  }
  selectConnection(0)
  fireEvent.click(screen.getByRole('button', {name: '연결 1 수동 실행'}))
  expect(preview).toHaveBeenLastCalledWith('manual-widget', 'first')
  expect(screen.getByRole('button', {name: '연결 1 수동 실행 중지'})).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  selectConnection(1)
  expect(preview).toHaveBeenLastCalledWith('manual-widget', null)
  expect(screen.queryByRole('button', {name: '연결 1 수동 실행'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '연결 2 수동 실행'}))
  expect(preview).toHaveBeenLastCalledWith('manual-widget', 'second')
  fireEvent.click(screen.getByRole('button', {name: '연결 2 수동 실행 중지'}))
  expect(preview).toHaveBeenLastCalledWith('manual-widget', null)
  selectConnection(0)
  fireEvent.click(screen.getByRole('button', {name: '연결 1 수동 실행'}))
  view.unmount()
  expect(preview).toHaveBeenLastCalledWith('manual-widget', null)
})
it('should connect a character action and adjust matching without exposing individual parameters', async () => {
  const bindings = mount()
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  try {
    fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
    await Promise.resolve()
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 행동'}))
    fireEvent.click(screen.getByRole('option', {name: '노트 들기'}))
    expect(bindings()[0]).toMatchObject({
      actions: [{id: '노트 들기', kind: 'expression'}],
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

it('should preserve group assignments and input identity while editing a selected connection', () => {
  const [bindings, setBindings] = createSignal<readonly SemanticBinding[]>([
    {
      enabled: true,
      exclusiveGroup: '감정',
      id: 'happy',
      mode: 'toggle',
      parameterId: null,
      text: '축하해요',
      threshold: 0.8,
    },
    {
      enabled: true,
      exclusiveGroup: '손동작',
      id: 'notes',
      mode: 'toggle',
      parameterId: null,
      text: '작성했어요',
      threshold: 0.8,
    },
  ])
  render(() => <SPoffoSemanticSettings value={bindings()} onChange={setBindings} />)
  fireEvent.click(screen.getByRole('button', {name: '작성했어요 편집'}))
  const input = screen.getByRole('textbox', {name: '연결 2 감정·행동·내용'})
  fireEvent.input(input, {target: {value: '파일에 작성했어요'}})
  expect(bindings()[1].text).toBe('파일에 작성했어요')
  expect(screen.getByRole('textbox', {name: '연결 2 감정·행동·내용'})).toBe(input)
  expect(bindings().map((binding) => binding.exclusiveGroup)).toEqual(['감정', '손동작'])
  expect(screen.queryByRole('textbox', {name: '연결 1 감정·행동·내용'})).toBeNull()
})
